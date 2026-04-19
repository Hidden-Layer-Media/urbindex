import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import { UrbindexApp } from './app.js';

let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new UrbindexApp();
  app.init();
  window.app = app;
});
