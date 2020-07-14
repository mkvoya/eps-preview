// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EpsPreviewEditorProvider } from './epsPreviewEditor';
import { execSync } from 'child_process';
import temp = require('temp');
import fs = require('fs');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "eps-preview" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('eps-preview.sidePreview', () => {
		// The code you place here will be executed every time your command is executed

		let panel = vscode.window.createWebviewPanel('', 'EPS Preview',
			vscode.ViewColumn.Beside,
		);
		const epsContent = vscode.window.activeTextEditor?.document.getText();
		// Process the data (note: error handling omitted)
		temp.track();
		temp.open('eps-preview-pdf', function (pdfErr, pdfInfo) {
			if (pdfErr) {
				return;
			}
			temp.open('eps-preview-svg', function (svgErr, svgInfo) {
				if (svgErr) {
					return;
				}
				// Thank https://superuser.com/a/769466/502597.
				execSync(`ps2pdf -dEPSCrop - ${pdfInfo.path}`, { input: epsContent });
				execSync(`pdf2svg ${pdfInfo.path} ${svgInfo.path}`);
				const stat = fs.fstatSync(svgInfo.fd);
				let svgContent = Buffer.alloc(stat.size);
				fs.readSync(svgInfo.fd, svgContent, 0, stat.size, null);
				panel.webview.html = "<h1>EPS Preview</h1>" + svgContent;
			});
		});
		// vscode.window.showInformationMessage('Eps-preview is ready!');
	});

	context.subscriptions.push(disposable);
	// context.subscriptions.push(EpsPreviewEditorProvider.register(context));
}

// this method is called when your extension is deactivated
export function deactivate() {}
