// const { app, BrowserWindow } = require('electron'); // เปลี่ยน () → {}
// const path = require('path');

// const isDev = process.env.NODE_ENV === 'development';

// function createWindow() {
//     const mainWindow = new BrowserWindow({ // แก้ typo: mainWiindow → mainWindow
//         width: 1200,
//         height: 800,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js'),
//             contextIsolation: true, // แก้ typo: contextIsolated → contextIsolation
//         }
//     });

  // ปิด menu bar
  // Menu.setApplicationMenu(null)

//     if (isDev) {
//         mainWindow.loadURL('http://localhost:3000');
//     } else {
//         mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
//     }
// }

// app.whenReady().then(createWindow);
// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') app.quit();
// });


// =====================================================================

const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  })



  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadFile(path.join(__dirname, '..', 'out', 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})