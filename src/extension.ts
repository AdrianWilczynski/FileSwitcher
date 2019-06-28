import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.goToNextRelatedFile', async (uri?: vscode.Uri) => await goToRelatedFile(uri, 'forward')),
		vscode.commands.registerCommand('extension.goToPreviousRelatedFile', async (uri?: vscode.Uri) => await goToRelatedFile(uri, 'back')),
		vscode.commands.registerCommand('extension.goToPickedRelatedFile', goToPickedRelatedFile));
}

export function deactivate() { }

async function goToRelatedFile(uri: vscode.Uri | undefined, direction: 'forward' | 'back') {
	uri = getCurrentDocument(uri);
	if (!uri) {
		return;
	}

	const info = gatherInfo(uri.fsPath);
	if (!info || info.relatedFiles.length <= 1) {
		return;
	}

	const nextFile = info.relatedFiles[getNextIndex(info.relatedFiles, info.position, direction)];

	try {
		const document = await vscode.workspace.openTextDocument(path.join(info.dirPath, nextFile));
		await vscode.window.showTextDocument(document);
	} catch {
		// It can sometimes fail to open the file if you "spam"/"button mash" the command rapidly 😅
	}
}

async function goToPickedRelatedFile(uri: vscode.Uri | undefined) {
	uri = getCurrentDocument(uri);
	if (!uri) {
		return;
	}

	const info = gatherInfo(uri.fsPath);
	if (!info || info.relatedFiles.length <= 1) {
		return;
	}

	const picks = info.relatedFiles.filter(f => f !== info.name);

	const pick = await vscode.window.showQuickPick(picks);
	if (!pick) {
		return;
	}

	const document = await vscode.workspace.openTextDocument(path.join(info.dirPath, pick));
	await vscode.window.showTextDocument(document);
}


function getCurrentDocument(uri?: vscode.Uri) {
	if (!uri && vscode.window.activeTextEditor) {
		uri = vscode.window.activeTextEditor.document.uri;
	}

	if (!uri || uri.scheme !== 'file') {
		return;
	}

	return uri;
}

function gatherInfo(filePath: string) {
	const name = path.basename(filePath);
	const basename = getBasename(name);
	if (!basename) {
		return;
	}

	const dirPath = path.dirname(filePath);
	const relatedFiles = getRelatedFiles(dirPath, basename);
	if (relatedFiles.length === 0) {
		return;
	}

	const position = relatedFiles.indexOf(name);

	return {
		name,
		basename,
		dirPath,
		relatedFiles,
		position
	};
}

function getBasename(name: string) {
	const matches = name.match('^[^.]*');
	if (!matches) {
		return;
	}

	return matches[0];
}

function getRelatedFiles(dirPath: string, basename: string) {
	const prefix = basename + '.';
	return fs.readdirSync(dirPath)
		.filter(f => path.basename(f).startsWith(prefix));
}

function getNextIndex(items: any[], index: number, direction: 'forward' | 'back') {
	if (direction === 'forward') {
		return index < items.length - 1 ? index + 1 : 0;
	} else {
		return index > 0 ? index - 1 : items.length - 1;
	}
}
