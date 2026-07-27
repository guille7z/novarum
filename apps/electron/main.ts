import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  net,
  protocol,
  session,
  shell,
} from 'electron';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

const devUrl = 'http://localhost:5173';
const appOrigin = 'app://novarum';

function frontendPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'frontend')
    : path.resolve(app.getAppPath(), '../frontend/build');
}

function registerAppProtocol() {
  const root = frontendPath();

  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const requested = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    const relative = path.relative(root, requested);
    if (url.host !== 'novarum' || relative.startsWith('..') || path.isAbsolute(relative)) {
      return new Response('Not found', { status: 404 });
    }

    const file = existsSync(requested) && relative ? requested : path.join(root, 'index.html');
    return net.fetch(pathToFileURL(file).toString());
  });
}

function configurePermissions() {
  const expectedOrigin = app.isPackaged ? appOrigin : devUrl;
  const allowed = (url: string) => {
    try {
      return new URL(url).origin === expectedOrigin;
    } catch {
      return false;
    }
  };

  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin) =>
      permission === 'media' && allowed(requestingOrigin || webContents?.getURL() || ''),
  );
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media' && allowed(webContents.getURL()));
  });
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    if (!allowed(request.securityOrigin)) return callback({});

    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      fetchWindowIcons: true,
    });
    const { response } = await dialog.showMessageBox({
      type: 'question',
      title: 'Share your screen',
      message: 'Choose a screen or window to share',
      buttons: [...sources.map((source) => source.name), 'Cancel'],
      cancelId: sources.length,
    });

    callback(response === sources.length ? {} : { video: sources[response] });
  });
}

function createWindow() {
  const window = new BrowserWindow({
    title: 'Novarum',
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#0c090c',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  const load = () => window.loadURL(app.isPackaged ? `${appOrigin}/` : devUrl).catch(() => {});
  window.webContents.on('did-fail-load', (_event, _code, _description, _url, isMainFrame) => {
    if (!app.isPackaged && isMainFrame) setTimeout(load, 500);
  });
  void load();
}

app.whenReady().then(() => {
  registerAppProtocol();
  configurePermissions();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
