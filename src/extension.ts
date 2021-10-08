// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { execSync } from 'child_process';
import temp = require('temp');
import fs = require('fs');
import path = require('path');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('postscript-preview.sidePreview', () => {

		// Create new panel
		let panel = vscode.window.createWebviewPanel('', 'PostScript Preview',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true
			}
		);

		// Get the EPS content
		const document = vscode.window.activeTextEditor?.document;

		if (!document) {
			// No active document
			console.log("No active document. Do nothing.");
			return;
		}

		const epsContent = document.getText();
		const filename = path.basename(document.fileName);
		let mainFilePath = document.fileName;

		temp.track();
		temp.open({prefix: "postscript-preview-svg_", suffix: '.pdf'}, function (pdfErr, pdfInfo) {
			if (pdfErr) {
				console.log("Creating temporary file eps-preview-pdf failed.");
				return;
			}
			temp.open({prefix: "postscript-preview-svg_", suffix: '.svg'}, function (svgErr, svgInfo) {
				if (svgErr) {
					console.log("Creating temporary file eps-preview-svg failed.");
					return;
				}
				// Transform EPS to SVG
				// Thank https://superuser.com/a/769466/502597.
				try {
					execSync(`ps2pdf "${mainFilePath}" "${pdfInfo.path}"`);
				} catch (err) {
					vscode.window.showInformationMessage('Failed to execute ps2pdf, is that installed?');
					console.log("Error executing ps2pdf.");
					console.log(err);
					// Clean up
					temp.cleanupSync();
					return;
				}
				try {
					execSync(`pdf2svg "${pdfInfo.path}" "${svgInfo.path}"`);
				} catch (err) {
					vscode.window.showInformationMessage('Failed to execute pdf2svg, is that installed?');
					console.log("Error executing pdf2svg.");
					console.log(err);
					// Clean up
					temp.cleanupSync();
					return;
				}
				try {
					const stat = fs.fstatSync(svgInfo.fd);
					let svgContent = Buffer.alloc(stat.size);
					fs.readSync(svgInfo.fd, svgContent, 0, stat.size, null);
					// Show SVG in the webview panel
					panel.webview.html = getWebviewContent(filename, svgContent);
				} catch (err) {
					console.log("Error reading the final file.");
					console.log(err);
				}
			});
		});

		// Clean up
		temp.cleanupSync();
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}


function getWebviewContent(fileName: any, svgContent: any) {
	return `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- One of the following themes -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css" /> <!-- 'nano' theme -->

  <!-- Modern or es5 bundle -->
  <script src="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.min.js"></script>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-uWxY/CJNBR+1zjPWmfnSnVxwRheevXITnMqoEIeG1LJrdI0GlVs/9cVSyPYXdcSF" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-kQtW33rZJAHjgefvhyyzcGF3C5TFyBQBA13V1RKPf4uH+bwyzQxZ6CmMZHmNBEfJ" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.5.0/dist/svg-pan-zoom.min.js"></script>

  <style>
    body {
      margin: 0;
      padding: 20px 0 0 20px;
    }

    div.sticky {
      position: -webkit-sticky;
      position: sticky;
      top: 0;
      background-color: yellow;
      padding: 50px;
      font-size: 20px;
    }

    div.btn-section {
      margin-top: 20px !important;
      margin-right: 10% !important;
      display: block;
      float: right;
      cursor: pointer;
      position: fixed;
      justify-content: flex-end;
      z-index: 3;
      right: 0;
      top: 0;
    }

    .pickr .pcr-button.clear {
      background: white;
    }

    svg {
      display: block;
      width: inherit;
      min-width: inherit;
      height: inherit;
      min-height: inherit;
    }

    .btn-controls {
      margin-top: 4px;
    }

    .control-btn {
      margin-left: 2px;
      margin-right: 2px;
    }

    #reset {
      width: 56px;
      height: auto;
      text-align: center;
    }

    .pickr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 20px !important;
      margin-right: 10% !important;
      float: right;
      position: fixed;
      justify-content: flex-end;
      z-index: 3;
      right: 0;
      top: 0;
      width: max-content;
      height: max-content;
    }

    div>.pickr {
      background: #000;
      color: white;
      border: 1px solid black;
      top: 0;
      margin: 0;
      padding: 0;
      cursor: pointer;
      border-radius: 4px;
      height: 30px;
      width: 40px;
    }
  </style>
  <title>PostScript Preview</title>
</head>

<body>

  <h2 style="font-size: 1.2em; margin-left: 10%; border: 1px solid black; width: max-content; padding: 4px 8px; border-radius: 4px; margin-bottom: 2%">${fileName}</h2>

  <div class="pickr-container">
    <div class="pickr"></div>
  </div>

  <div class="btn-controls d-flex justify-content-center">
    <button id="zoom-in" type="button" class="control-btn btn btn-primary btn-sm">-</button>
    <button id="zoom-out" type="button" class="control-btn btn btn-primary btn-sm">+</button>
  </div>
  <div class="btn-controls d-flex justify-content-center">
    <button id="reset" type="button" class="btn btn-outline-primary reset-btn btn-sm">Reset</button>
  </div>

  <section id="zoomText" class="d-flex justify-content-center">
    <div id="container" style="margin: 3% 10% 5%;width: inherit; height: max-content; border:1px solid black; border-radius: 8px;">
      ${svgContent}
    </div>
  </section>

  <script>
    const inputElement = document.querySelector('.pickr');
    // Simple example, see optional options for more configuration.
    const pickr = Pickr.create({
      el: inputElement,
      useAsButton: true,
      default: '#9BFFF4',
      defaultRepresentation: 'HEX',
      theme: 'nano', // or 'monolith', or 'nano'
      swatches: [
        'rgba(244, 67, 54, 1)',
        'rgba(233, 30, 99, 1)',
        'rgba(156, 39, 176, 1)',
        'rgba(103, 58, 183, 1)',
        'rgba(63, 81, 181, 1)',
        'rgba(33, 150, 243, 1)',
        'rgba(3, 169, 244, 1)',
      ],
      components: {
        // Main components
        preview: true,
        opacity: true,
        hue: true,
        // Input / output Options
        interaction: {
          hex: true,
          rgba: true,
          input: true,
          clear: true,
          save: true
        }
      }
    }).on('init', pickr => {
      inputElement.style.background = pickr.getSelectedColor().toHEXA().toString();
    }).on('save', color => {
      pickr.hide();
      document.getElementById("container").style.background = color.toHEXA().toString();
      inputElement.style.background = pickr.getSelectedColor().toHEXA().toString();
    });

    // SVG Pan Zoom
    window.onload = function() {
      const panZoom = svgPanZoom(document.getElementsByTagName("svg")[0], {
        zoomEnabled: true,
        controlIconsEnabled: false
      });
      document.getElementById('zoom-out').addEventListener('click', function(ev) {
        ev.preventDefault()
        panZoom.zoomIn()
      });
      document.getElementById('zoom-in').addEventListener('click', function(ev) {
        ev.preventDefault()
        panZoom.zoomOut()
      });
      document.getElementById('reset').addEventListener('click', function(ev) {
        ev.preventDefault()
        panZoom.resetZoom()
        panZoom.resetPan()
      });
    };
  </script>
</body>

</html>
`;
}