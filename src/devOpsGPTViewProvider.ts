
import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import createPrompt from './prompt';
import * as fs from 'fs';
import { Settings } from './extension';
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

type AuthInfo = { isLocal?: boolean, isAzure?: boolean, apiKey?: string, azure_endpoint?: string, azure_deployment_name?: string };

export class DevOpsGPTViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'devops-copilot.chatView';
    private _view?: vscode.WebviewView;

    private _openai?: any;
    public command?: string;

    private _response?: string;
    private _prompt?: string;
    private _currentMessageNumber = 0;

    private _settings: Settings = {
        selectedInsideCodeblock: false,
        pasteOnClick: true,
        maxTokens: 500,
        temperature: 0.5
    };
    private _apiKey?: string;
    private _isAzure?: boolean;
    private _isLocal?: boolean;
    private _azureEndpoint?: string;
    private _azureDeploymentName?: string;

    constructor(private readonly _extensionUri: vscode.Uri) {

    }

    public setAuthenticationInfo(authInfo: AuthInfo) {
        this._apiKey = authInfo.apiKey;
        if (authInfo.isAzure) {
            this._isAzure = authInfo.isAzure;
            this._azureEndpoint = authInfo.azure_endpoint;
            this._azureDeploymentName = authInfo.azure_deployment_name;
        } else {
            this._isAzure = authInfo.isAzure;
            this._isLocal = authInfo.isLocal;
        }
        this._newAPI();
    }

    public setSettings(settings: Settings) {
        this._settings = { ...this._settings, ...settings };
    }

    public getSettings() {
        return this._settings;
    }

    private _newAPI() {
        if (this._isAzure) {
            if (!this._azureEndpoint || !this._azureDeploymentName || !this._apiKey) {
                console.warn("Azure endpoint or deployment name or azure api key are not set, please go to extension settings (read README.md for more info)");
                vscode.window.showErrorMessage('Azure endpoint or deployment name not set, please go to extension settings (read README.md for more info)');
            } else {
                this._openai = new OpenAIClient(this._azureEndpoint,new AzureKeyCredential(this._apiKey));
            }
        } else if(this._isLocal){
            this._openai = new OpenAI({apiKey: "anything", baseURL: "http://0.0.0.0:8000"});
        }
        else {
            if (!this._apiKey) {
                console.warn("API key not set, please go to extension settings (read README.md for more info)");
                vscode.window.showErrorMessage('API key not set, please go to extension settings (read README.md for more info)');
            }else{
                this._openai = new OpenAI({ apiKey: this._apiKey });
            }
        }
        
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        // set options for the webview, allow scripts
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        // set the HTML for the webview
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // add an event listener for messages received by the webview
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'codeSelected':
                    {
                        if (!this._settings.pasteOnClick) {
                            break;
                        }
                        let code = data.value;
                        const snippet = new vscode.SnippetString();
                        snippet.appendText(code);
                        vscode.window.activeTextEditor?.insertSnippet(snippet);
                        break;
                    }
                case 'prompt':
                    {
                        this.search(data.value);
                    }
                case 'feedbackPlus':
                    {
                        var readStr: Uint8Array;
                        const config = vscode.workspace.getConfiguration('genai') as { get(key: string): string };
                        if (fs.existsSync(config.get('feedbackPath')) === false) {
                            vscode.window.showErrorMessage('Please set the feedback path in the settings under DevOps-Copilot genai.feedbackPath');
                            break;
                        }
                        const path = vscode.Uri.file(config.get('feedbackPath') + "/feedback.txt");

                        if (fs.existsSync(config.get('feedbackPath') + "/feedback.txt")) {
                            const readData = await vscode.workspace.fs.readFile(path);
                            readStr = Buffer.from(Buffer.from(readData).toString('utf8') + "\n" + data.value + "||--||" + this._settings.model + "||--||" + this.command, 'utf8');

                        } else {
                            readStr = Buffer.from(data.value + "||--||" + this._settings.model + "||--||" + this.command, 'utf8');
                        }

                        await vscode.workspace.fs.writeFile(path, readStr);
                        break;
                    }
                case 'feedbackNegative':
                    {
                        var readStr: Uint8Array;
                        const config = vscode.workspace.getConfiguration('genai') as { get(key: string): string };
                        if (fs.existsSync(config.get('feedbackPath')) === false) {
                            vscode.window.showErrorMessage('Please set the feedback path in the settings under DevOps-Copilot genai.feedbackPath');
                            break;
                        }
                        const path = vscode.Uri.file(config.get('feedbackPath') + "/feedback.txt");

                        if (fs.existsSync(config.get('feedbackPath') + "/feedback.txt")) {
                            const readData = await vscode.workspace.fs.readFile(path);
                            readStr = Buffer.from(Buffer.from(readData).toString('utf8') + "\n" + data.value + "||--||" + this._settings.model + "||--||" + this.command, 'utf8');

                        } else {
                            readStr = Buffer.from(data.value + "||--||" + this._settings.model + "||--||" + this.command, 'utf8');
                        }

                        await vscode.workspace.fs.writeFile(path, readStr);
                        break;

                    }
            }
        });
    }


    public async resetSession() {
        this._prompt = '';
        this._response = '';
        this._view?.webview.postMessage({ type: 'setPrompt', value: '' });
        this._view?.webview.postMessage({ type: 'addResponse', value: '' });
        this._newAPI();
    }

    public async search(prompt?: string) {
        this._prompt = prompt;
        if (!prompt) {
            return;
        };

        // Check if the ChatGPTAPI instance is defined
        if (!this._openai) {
            this._newAPI();
        }

        // focus gpt activity from activity bar
        if (!this._view) {
            await vscode.commands.executeCommand('devops-copilot.chatView.focus');
        } else {
            this._view?.show?.(true);
        }

        let response = '';
        this._response = '';
        // Get the selected text of the active editor
        const selection = vscode.window.activeTextEditor?.selection;
        const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
        let searchPrompt = createPrompt(prompt, this._settings, selectedText);
        const promptVal = this._prompt;

        await this.processPrompt(promptVal || '', searchPrompt).then(async output => {
            response = output || '';
        });
        // Saves the response
        this._response = response;

        // Show the view and send a message to the webview with the response
        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ type: 'addResponse', value: response });
        }
    }

    private async processPrompt(promptVal: string, searchPrompt: string) {
        let response = '';
        if (!this._openai) {
            response = '[ERROR] API token not set, please go to extension settings to set it (read README.md for more info)';
        } else {
            // If successfully signed in
            console.log("sendMessage");

            // Make sure the prompt is shown
            this._view?.webview.postMessage({ type: 'setPrompt', value: promptVal });
            this._view?.webview.postMessage({ type: 'addResponse', value: '...' });

            // Increment the message number
            this._currentMessageNumber++;

            try {
                let currentMessageNumber = this._currentMessageNumber;

                let completion;
                console.log(this._settings.model);

                if(this._isAzure){
                    
                    const events = this._openai.listChatCompletions(this._azureDeploymentName,[{ role: 'user', content: searchPrompt }], { maxTokens: 128 });
                    var content = "";
                    for await (const event of events) {
                        for (const choice of event.choices) {
                        const delta = choice.delta?.content;
                        if (delta !== undefined) {
                            content = content + delta;
                            }
                        }
                    }
                    response = content ?? '';
                }
                else{
                    completion = await this._openai.chat.completions.create({
                        model: this._settings.model || 'code-davinci-002',
                        messages: [{ role: 'user', content: searchPrompt }],
                        temperature: this._settings.temperature,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        max_tokens: this._settings.maxTokens,
                        stop: ['\nUSER: ', '\nUSER', '\nASSISTANT']
                    });

                    if (this._currentMessageNumber !== currentMessageNumber) {
                        return;
                    }

                    response = completion.choices[0].message.content ?? '';
                }

                const REGEX_CODEBLOCK = new RegExp('\`\`\`', 'g');
                const matches = response.match(REGEX_CODEBLOCK);
                const count = matches ? matches.length : 0;
                if (count % 2 !== 0) {
                    response += '\n\`\`\`';
                }
                response += `\n\n---\n`;
                if(!this._isAzure){
                    if (completion.choices[0].finish_reason === 'length') {
                        response += `\n[WARNING] The response was truncated because it reached the maximum number of tokens. You may want to increase the maxTokens setting.\n\n`;
                    }
                    
                        response += `Tokens used: ${completion.usage?.total_tokens}`;
                }

            } catch (error: any) {
                let e = '';
                if (error.response) {
                    console.log(error.response.status);
                    console.log(error.response.data);
                    e = `${error.response.status} ${error.response.data.message}`;
                } else {
                    console.log(error.message);
                    e = error.message;
                }
                response += `\n\n---\n[ERROR] ${e}`;
            }
        }
        return response;
    }

    public async review(diffs: string[]) {
        // Check if the ChatGPTAPI instance is defined
        if (!this._openai) {
            this._newAPI();
        }
        // focus gpt activity from activity bar
        if (!this._view) {
            await vscode.commands.executeCommand('devops-copilot.chatView.focus');
        } else {
            this._view?.show?.(true);
        }

        let response = '';
        this._response = '';
        // Get the selected text of the active editor
        const selection = vscode.window.activeTextEditor?.selection;
        const selectedText = vscode.window.activeTextEditor?.document.getText(selection);


        for (const index in diffs) {
            const firstLine = diffs[index].split("\n")[0];
            if (firstLine.includes(".c ") || firstLine.includes(".go ") || firstLine.includes(".ts ") || firstLine.includes(".py ") || firstLine.includes(".java ") || firstLine.includes(".js ")
                || firstLine.includes(".cpp ") || firstLine.includes(".h ") || firstLine.includes(".cs ") || firstLine.includes(".php ")
                || firstLine.includes(".rs ") || firstLine.includes(".rb ") || firstLine.includes(".swift ") || firstLine.includes(".scala ") || firstLine.includes(".pl ")) {

                var prompt = "Make a code review of the changes made in this diff:\n" + diffs[index];
                let searchPrompt = createPrompt(prompt, this._settings, selectedText);
                this._prompt = prompt;
                if (!prompt) {
                    return;
                };
                const promptVal = "Code Review for your changes";
                await this.processPrompt(promptVal, searchPrompt).then(async output => {
                    response = output || '';
                });

                this._response = this._response + "\n" + firstLine + " : \n\n" + response + "\n\n---\n";

            }
            await this.delay(1000);
        }
        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ type: 'addResponse', value: this._response });
        }
    }

    public async feedback(url: string) {
        const path = vscode.Uri.file(url);
        if (fs.existsSync(url)) {
            const readData = await vscode.workspace.fs.readFile(path);
            const data = Buffer.from(readData).toString('utf8');
            this._view?.webview.postMessage({ type: 'feedbackView', value: data });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const microlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'microlight.min.js'));
        const tailwindUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'showdown.min.js'));
        const showdownUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'tailwind.min.js'));
        const chartUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'charts.min.css'));

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<link rel="stylesheet" href="${chartUri}">
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<script src="${tailwindUri}"></script>
				<script src="${showdownUri}"></script>
				<script src="${microlightUri}"></script>
				<style>
				.code {
					white-space: pre;
				}
				p {
					padding-top: 0.4rem;
					padding-bottom: 0.4rem;
				}
				/* overrides vscodes style reset, displays as if inside web browser */
				ul, ol {
					list-style: initial !important;
					margin-left: 10px !important;
				}
				h1, h2, h3, h4, h5, h6 {
					font-weight: bold !important;
				}
				.rating {
					display: inline-block;
					width: 100%;
					margin-top: 20px;
					padding-top: 20px;
					text-align: center;
				  }
				.like, .dislike {
				display: inline-block;
				cursor: pointer;
				margin: 10px;
				}
				.dislike:hover,.like:hover {
				color: #2EBDD1;
				transition: all .2s ease-in-out;
				transform: scale(1.1);
				}
				.active {
				color: #2EBDD1;
				}
                #pie-main {
                    width: 90%;
                    max-width: 250px;
                    margin: 0 1rem;
                }
                #bar-main {
                    width: 300%;
                    max-width: 600px;
                }
                #bar-main .column {
                    --labels-size: 4rem;
                }
				</style>
			</head>
			<body>
				<input class="h-10 w-full text-white bg-stone-700 p-4 text-sm" placeholder="Chat with DevOps GPT" id="prompt-input" />

				<div id="response" class="pt-4 text-sm">
				</div>
				<div id="rating-ele" class="rating">
					<!-- Thumbs up -->
					<div id="up" class="like grow">
						<i class="fa fa-thumbs-up fa-3x like" aria-hidden="true"></i>
					</div>
					<!-- Thumbs down -->
					<div id="down" class="dislike grow">
						<i class="fa fa-thumbs-down fa-3x like" aria-hidden="true"></i>
					</div>
				</div>

				<div id="feedback-view" >

				</div>

				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}