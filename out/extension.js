"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const languageExtensions_1 = require("./languageExtensions");
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
async function getSelectedFiles() {
    const visibleTextEditors = vscode.window.visibleTextEditors;
    if (visibleTextEditors.length > 0) {
        return visibleTextEditors.map(editor => editor.document.uri);
    }
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
        return [activeTextEditor.document.uri];
    }
    throw new Error("No files selected or open in editor");
}
function canProcessFile(filePath) {
    try {
        const fileStats = fs.statSync(filePath);
        if (fileStats.size > MAX_FILE_SIZE) {
            vscode.window.showWarningMessage(`Skipped large file: ${filePath}`);
            return false;
        }
        return (0, languageExtensions_1.getFileFormat)(filePath) !== null;
    }
    catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return false;
    }
}
function processFile(filePath, basePath) {
    if (!canProcessFile(filePath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(filePath, "utf8");
        const relativePath = path.relative(basePath, filePath);
        const format = (0, languageExtensions_1.getFileFormat)(filePath);
        return { content, relativePath, language: format };
    }
    catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
}
function formatContent(result) {
    const codeBlock = result.language === 'markdown' ? '``````' : '```';
    return `\n\n${codeBlock}${result.relativePath}\n${result.content}\n${codeBlock}\n\n`;
}
function getAllFilesRecursively(directoryPath) {
    let files = [];
    const items = fs.readdirSync(directoryPath);
    for (const item of items) {
        const fullPath = path.join(directoryPath, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            files = files.concat(getAllFilesRecursively(fullPath));
        }
        else if (stats.isFile()) {
            files.push(fullPath);
        }
    }
    return files;
}
async function processFileOrDirectory(uri) {
    try {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            throw new Error('File is not in a workspace');
        }
        const basePath = workspaceFolder.uri.fsPath;
        const fileStats = fs.statSync(uri.fsPath);
        let content = '';
        if (fileStats.isDirectory()) {
            const allFiles = getAllFilesRecursively(uri.fsPath);
            for (const filePath of allFiles) {
                const result = processFile(filePath, basePath);
                if (result) {
                    content += formatContent(result);
                }
            }
        }
        else {
            const result = processFile(uri.fsPath, basePath);
            if (result) {
                content += formatContent(result);
            }
        }
        return content;
    }
    catch (error) {
        console.error(`Error processing path ${uri.fsPath}:`, error);
        return '';
    }
}
function activate(context) {
    let disposable = vscode.commands.registerCommand("copy-text-selected-files.copyFilesContent", async (uri, uris) => {
        try {
            const filesToProcess = uris || (uri ? [uri] : await getSelectedFiles());
            if (!filesToProcess?.length) {
                vscode.window.showInformationMessage("No files selected or open in editor");
                return;
            }
            let aggregatedContent = '';
            for (const file of filesToProcess) {
                aggregatedContent += await processFileOrDirectory(file);
            }
            if (aggregatedContent) {
                await vscode.env.clipboard.writeText(aggregatedContent);
                vscode.window.showInformationMessage("Content copied to clipboard!");
            }
            else {
                vscode.window.showInformationMessage("No text files found or selected!");
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            vscode.window.showErrorMessage(`Error: ${message}`);
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map