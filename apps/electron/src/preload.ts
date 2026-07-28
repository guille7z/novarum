import { ipcRenderer } from 'electron';

window.addEventListener('DOMContentLoaded', () => {
  let frame = 0;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const rgba = (color: string) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    return `rgba(${red}, ${green}, ${blue}, ${(alpha ?? 255) / 255})`;
  };
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const style = getComputedStyle(document.documentElement);
      ipcRenderer.send(
        'titlebar-colors',
        rgba(style.getPropertyValue('--background').trim()),
        rgba(style.getPropertyValue('--foreground').trim())
      );
    });
  };

  new MutationObserver(update).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
  new MutationObserver(update).observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  update();
});
