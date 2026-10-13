import './styles/tokens.css';
import './styles/fonts.css';
import './styles/base.css';
import './styles/footer.css';
import './styles/concept.css';

document.querySelectorAll<HTMLElement>('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
