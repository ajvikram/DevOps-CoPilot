import * as vscode from 'vscode';
import { simpleGit, SimpleGit } from 'simple-git';
import { DevOpsGPTViewProvider } from './devOpsGPTViewProvider';
import * as fs from 'fs';

export type Settings = {selectedInsideCodeblock?: boolean, pasteOnClick?: boolean, model?: string, maxTokens?: number, temperature?: number};


export function activate(context: vscode.ExtensionContext) {
	const provider = initProvider(context);

	const commandHandler = (command:string) => {
		const config = vscode.workspace.getConfiguration('devops-copilot');
		const prompt = config.get(command) as string;
		provider.command = command.replace('promptPrefix.', '');
		provider.search(prompt);
	};

	const reviewHandler = () => {
		const config = vscode.workspace.getConfiguration('gitReview');
		const path = config.get('gitPath') as string;
		if (fs.existsSync(path)){
			const git: SimpleGit = simpleGit(path);
			git.diff().then(async output => {
				const diffs = output.split("diff --git");
				provider.command = 'gitReview';
				provider.review(diffs);
			});
		}else {
			vscode.window.showErrorMessage('Please set the git path in the settings uner DevOps-Copilot gitReview.gitPath');
		}
	};

	const feedbackHandler = () => {	
		const config = vscode.workspace.getConfiguration('genai');
		const path = config.get('feedbackPath') as string;
		if (fs.existsSync(path)){
			provider.feedback(vscode.workspace.getConfiguration('genai').get('feedbackPath') + "/feedback.txt");
		}else{
			vscode.window.showErrorMessage('Please set the feedback path in the settings under DevOps-Copilot genai.feedbackPath');
		}
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('devops-copilot.ask', () => 
			vscode.window.showInputBox({ prompt: 'What do you want to do?' })
			.then((value) => provider.search(value))
		),
		vscode.commands.registerCommand('devops-copilot.explain', () => commandHandler('promptPrefix.explain')),
		vscode.commands.registerCommand('devops-copilot.refactor', () => commandHandler('promptPrefix.refactor')),
		vscode.commands.registerCommand('devops-copilot.optimize', () => commandHandler('promptPrefix.optimize')),
		vscode.commands.registerCommand('devops-copilot.findProblems', () => commandHandler('promptPrefix.findProblems')),
		vscode.commands.registerCommand('devops-copilot.documentation', () => commandHandler('promptPrefix.documentation')),
		vscode.commands.registerCommand('devops-copilot.gitReview', () => reviewHandler()),
		vscode.commands.registerCommand('devops-copilot.feedbackView', () => feedbackHandler())
	);


	vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
		if (event.affectsConfiguration('devops-copilot.apiKey') || event.affectsConfiguration('devops-copilot.azureDeploymentName') ) {
			const config = vscode.workspace.getConfiguration('devops-copilot');
			if( config.get('provider') === "azure"){
				provider.setAuthenticationInfo({isLocal: false, isAzure: true, apiKey: config.get('apiKey'), azure_endpoint: config.get('azureEndpoint'), azure_deployment_name: config.get('azureDeploymentName') });
			}else if ( config.get('provider') === "local"){
				provider.setAuthenticationInfo({isLocal: true, isAzure: false, apiKey: config.get('apiKey') });
			}
			else{
				provider.setAuthenticationInfo({isLocal: false, isAzure: false, apiKey: config.get('apiKey') });
			}
			console.log("API key changed");
		} else if (event.affectsConfiguration('devops-copilot.selectedInsideCodeblock')) {
			const config = vscode.workspace.getConfiguration('devops-copilot');
			provider.setSettings({ selectedInsideCodeblock: config.get('selectedInsideCodeblock') || false });
		} else if (event.affectsConfiguration('devops-copilot.pasteOnClick')) {
			const config = vscode.workspace.getConfiguration('devops-copilot');
			provider.setSettings({ pasteOnClick: config.get('pasteOnClick') || false });
		} else if (event.affectsConfiguration('devops-copilot.maxTokens')) {
			const config = vscode.workspace.getConfiguration('devops-copilot');
			provider.setSettings({ maxTokens: config.get('maxTokens') || 500 });
		} else if (event.affectsConfiguration('devops-copilot.temperature')) {
			const config = vscode.workspace.getConfiguration('devops-copilot');
			provider.setSettings({ temperature: config.get('temperature') || 0.5 });
		} else if (event.affectsConfiguration('devops-copilot.model')) {
			const config = vscode.workspace.getConfiguration('devops-copilot');
			provider.setSettings({ model: config.get('model') || 'text-davinci-003' });
		}
	});
}

function initProvider(context: vscode.ExtensionContext) {
	const provider = new DevOpsGPTViewProvider(context.extensionUri);
	
	const config = vscode.workspace.getConfiguration('devops-copilot');
	if( config.get('provider') === "azure"){
		provider.setAuthenticationInfo({isLocal: false, isAzure: true, apiKey: config.get('apiKey'), azure_endpoint: config.get('azureEndpoint'), azure_deployment_name: config.get('azureDeploymentName') });
	}else if ( config.get('provider') === "local"){
		provider.setAuthenticationInfo({isLocal: true, isAzure: false, apiKey: config.get('apiKey') });
	}else {
		provider.setAuthenticationInfo({isLocal: false, isAzure: false, apiKey: config.get('apiKey') });
	};

	provider.setSettings({
		selectedInsideCodeblock: config.get('selectedInsideCodeblock') || false,
		pasteOnClick: config.get('pasteOnClick') || false,
		maxTokens: config.get('maxTokens') || 500,
		temperature: config.get('temperature') || 0.5,
		model: config.get('model') || 'text-davinci-003'
	});
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DevOpsGPTViewProvider.viewType, provider,  {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);
	return provider;
}

export function deactivate() {}