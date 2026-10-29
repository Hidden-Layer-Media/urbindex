// Firestore security rules tests. Run with: npm run test:rules (needs Java for the emulator).
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, writeBatch, increment, serverTimestamp,
  collection, query, where, getDocs,
} from 'firebase/firestore';

let env;
const day = Math.floor(Date.now() / 86400000);
const base = { name: 'Old mill', description: 'test spot', coordinates: [40, -75], status: 'active', category: 'abandoned' };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-urbindex',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'locations/loc1'), { ...base, createdBy: 'owner', visibility: 'public', likesCount: 0, visitCount: 0, commentCount: 0 });
    await setDoc(doc(db, 'locations/legacy'), { ...base, createdBy: 'owner' }); // pre-visibility doc
    await setDoc(doc(db, 'private_locations/priv1'), { ...base, createdBy: 'owner', visibility: 'private' });
    await setDoc(doc(db, 'location_comments/bobs'), { locationId: 'loc1', userId: 'bob', text: 'hi' });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const as = uid => env.authenticatedContext(uid).firestore();

// ── privacy ──
test('public locations readable by anyone', async () => {
  await assertSucceeds(getDoc(doc(anon(), 'locations/loc1')));
  await assertSucceeds(getDocs(query(collection(anon(), 'locations'), where('status', '==', 'active'))));
});

test('private locations readable only by owner', async () => {
  await assertFails(getDoc(doc(anon(), 'private_locations/priv1')));
  await assertFails(getDoc(doc(as('alice'), 'private_locations/priv1')));
  await assertSucceeds(getDoc(doc(as('owner'), 'private_locations/priv1')));
  await assertSucceeds(getDocs(query(collection(as('owner'), 'private_locations'), where('createdBy', '==', 'owner'), where('status', '==', 'active'))));
  await assertFails(getDocs(query(collection(as('alice'), 'private_locations'), where('createdBy', '==', 'owner'))));
});

test('visibility must match collection', async () => {
  const db = as('alice');
  await assertFails(setDoc(doc(db, 'locations/a1'), { ...base, createdBy: 'alice', visibility: 'private' }));
  await assertFails(setDoc(doc(db, 'private_locations/a2'), { ...base, createdBy: 'alice', visibility: 'public' }));
  await assertSucceeds(setDoc(doc(db, 'locations/a3'), { ...base, createdBy: 'alice', visibility: 'public' }));
  await assertSucceeds(setDoc(doc(db, 'private_locations/a4'), { ...base, createdBy: 'alice', visibility: 'followers' }));
});

test('location ids must be plain', async () => {
  await assertFails(setDoc(doc(as('alice'), "locations/x');alert(1)//"), { ...base, createdBy: 'alice', visibility: 'public' }));
});

test('cannot create location as someone else', async () => {
  await assertFails(setDoc(doc(as('alice'), 'locations/a5'), { ...base, createdBy: 'owner', visibility: 'public' }));
});

// ── owner edits ──
test('owner can edit and soft-delete own spot', async () => {
  const db = as('owner');
  await assertSucceeds(updateDoc(doc(db, 'locations/loc1'), { name: 'New mill', photos: ['https://x/y.jpg'], currentVibe: 'quiet', vibeUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, 'locations/legacy'), { status: 'deleted', deletedAt: serverTimestamp() }));
});

test('owner cannot fake counters or go private in public collection', async () => {
  const db = as('owner');
  await assertFails(updateDoc(doc(db, 'locations/loc1'), { likesCount: 99 }));
  await assertFails(updateDoc(doc(db, 'locations/loc1'), { visibility: 'private' }));
});

test('others cannot edit a spot', async () => {
  await assertFails(updateDoc(doc(as('alice'), 'locations/loc1'), { name: 'mine now' }));
});

// ── likes ──
function likeBatch(db, uid, step) {
  const b = writeBatch(db);
  const likeRef = doc(db, `location_likes/${uid}_loc1`);
  if (step > 0) b.set(likeRef, { userId: uid, locationId: 'loc1', createdAt: serverTimestamp() });
  else b.delete(likeRef);
  b.update(doc(db, 'locations/loc1'), { likesCount: increment(step) });
  return b.commit();
}

test('like and unlike with proof doc', async () => {
  const db = as('alice');
  await assertSucceeds(likeBatch(db, 'alice', 1));
  await assertFails(likeBatch(db, 'alice', 1)); // already liked
  await assertSucceeds(likeBatch(db, 'alice', -1));
  await assertFails(likeBatch(db, 'alice', -1)); // nothing to unlike
});

test('like counter cannot move without proof or by more than 1', async () => {
  const db = as('alice');
  await assertFails(updateDoc(doc(db, 'locations/loc1'), { likesCount: increment(1) }));
  const b = writeBatch(db);
  b.set(doc(db, 'location_likes/alice_loc1'), { userId: 'alice', locationId: 'loc1' });
  b.update(doc(db, 'locations/loc1'), { likesCount: increment(2) });
  await assertFails(b.commit());
});

test('like doc id must belong to the liker', async () => {
  await assertFails(setDoc(doc(as('alice'), 'location_likes/bob_loc1'), { userId: 'alice', locationId: 'loc1' }));
});

test('counter bump cannot smuggle other field changes', async () => {
  const db = as('alice');
  const b = writeBatch(db);
  b.set(doc(db, 'location_likes/alice_loc1'), { userId: 'alice', locationId: 'loc1' });
  b.update(doc(db, 'locations/loc1'), { likesCount: increment(1), name: 'hijacked' });
  await assertFails(b.commit());
});

// ── comments ──
test('comment with counter bump', async () => {
  const db = as('alice');
  const b = writeBatch(db);
  b.set(doc(db, 'location_comments/c1'), { locationId: 'loc1', userId: 'alice', text: 'nice' });
  b.update(doc(db, 'locations/loc1'), { commentCount: increment(1), lastCommentId: 'c1' });
  await assertSucceeds(b.commit());
});

test('comment counter needs a fresh comment by the same user', async () => {
  const db = as('alice');
  await assertFails(updateDoc(doc(db, 'locations/loc1'), { commentCount: increment(1), lastCommentId: 'bobs' }));
});

// ── check-ins ──
function visitBatch(db, uid, id) {
  const b = writeBatch(db);
  b.set(doc(db, `location_visits/${id}`), { locationId: 'loc1', userId: uid, createdAt: serverTimestamp() });
  b.update(doc(db, 'locations/loc1'), { visitCount: increment(1), lastVisitId: id });
  return b.commit();
}

test('one check-in per day', async () => {
  const db = as('alice');
  await assertSucceeds(visitBatch(db, 'alice', `loc1_alice_${day}`));
  await assertFails(visitBatch(db, 'alice', `loc1_alice_${day}`));
});

test('check-in id must be today for this user', async () => {
  const db = as('alice');
  await assertFails(visitBatch(db, 'alice', `loc1_alice_${day - 5}`));
  await assertFails(visitBatch(db, 'alice', `loc1_bob_${day}`));
  await assertFails(visitBatch(db, 'alice', 'random'));
});

// ── status reports ──
function vibeBatch(db, uid, id, vibe, docVibe = vibe) {
  const b = writeBatch(db);
  b.set(doc(db, `location_status_updates/${id}`), { locationId: 'loc1', userId: uid, userName: 'A', vibe: docVibe, createdAt: serverTimestamp() });
  b.update(doc(db, 'locations/loc1'), { currentVibe: vibe, vibeUpdatedAt: serverTimestamp(), lastStatusUpdateId: id });
  return b.commit();
}

test('status report updates vibe', async () => {
  await assertSucceeds(vibeBatch(as('alice'), 'alice', 's1', 'busy'));
});

test('status report must match and be a known vibe', async () => {
  await assertFails(vibeBatch(as('alice'), 'alice', 's2', 'quiet', 'busy'));
  await assertFails(vibeBatch(as('alice'), 'alice', 's3', 'party'));
  await assertFails(updateDoc(doc(as('alice'), 'locations/loc1'), { currentVibe: 'quiet', vibeUpdatedAt: serverTimestamp() }));
});

// ── reports ──
test('one report per user, write-only', async () => {
  const db = as('alice');
  const report = { locationId: 'loc1', reason: 'gone', note: '', reportedBy: 'alice', createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db, 'location_reports/loc1_alice'), report));
  await assertFails(setDoc(doc(db, 'location_reports/loc1_alice'), report));
  await assertFails(getDoc(doc(db, 'location_reports/loc1_alice')));
  await assertFails(setDoc(doc(db, 'location_reports/loc1_bob'), { ...report }));
  await assertFails(setDoc(doc(anon(), 'location_reports/loc1_x'), { ...report, reportedBy: 'x' }));
});
