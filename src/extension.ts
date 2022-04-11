// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { execSync } from 'child_process';
import temp = require('temp');
import fs = require('fs');
import path = require('path');

function genPreview(filepath:string, panel:vscode.WebviewPanel) {
	let epsContent : string;
	try {
		epsContent = fs.readFileSync(filepath).toString();
	} catch (err) {
		vscode.window.showInformationMessage('Failed to read eps file');
		console.log("Error reading " + filepath + ".");
		console.log(err);
		return;
	}

	const shortname = path.basename(filepath);
	// launch.json configuration
	const config = vscode.workspace.getConfiguration('eps-preview');
	// retrieve values
	const ps2pdfPath = config.get('path.ps2pdf', 'ps2pdf');
	const pdf2svgPath = config.get('path.pdf2svg', 'pdf2svg');

	temp.track();
	temp.open('eps-preview-pdf', function (pdfErr, pdfInfo) {
		if (pdfErr) {
			console.log("Creating temporary file eps-preview-pdf failed.");
			return;
		}
		temp.open('eps-preview-svg', function (svgErr, svgInfo) {
			if (svgErr) {
				console.log("Creating temporary file eps-preview-svg failed.");
				return;
			}
			// Transform EPS to SVG
			// Thank https://superuser.com/a/769466/502597.
			try {
				execSync(`${ps2pdfPath} -dEPSCrop - ${pdfInfo.path}`, { input: epsContent });
			} catch (err) {
				vscode.window.showInformationMessage('Failed to execute ps2pdf, is that installed?');
				console.log("Error executing ps2pdf.");
				console.log(err);
				// Clean up
				temp.cleanupSync();
				return;
			}
			try {
				execSync(`${pdf2svgPath} ${pdfInfo.path} ${svgInfo.path}`);
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
				panel.webview.html = `<h1>${shortname}</h1>` + svgContent;
			} catch (err) {
				console.log("Error reading the final file.");
				console.log(err);
			}
		});
	});

	// Clean up
	temp.cleanupSync();
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('eps-preview.sidePreview', () => {

		// Create new panel
		let panel = vscode.window.createWebviewPanel('', 'EPS Preview',
			vscode.ViewColumn.Beside,
		);

		// Get the EPS content
		const document = vscode.window.activeTextEditor?.document;

		if (!document) {
			// No active document
			console.log("No active document. Do nothing.");
			return;
		}
		const filename = document.fileName;
		genPreview(filename, panel);
		let watcher = vscode.workspace.createFileSystemWatcher(filename);
		watcher.onDidChange((e:vscode.Uri) => {
			genPreview(filename, panel);
		});
		panel.onDidDispose(()=>{
			watcher.dispose();
		});
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
