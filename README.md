# devops-copilot 

A visual Studio Code IDE Extension for developers and ops, which can help to generate code, find problems/vulnerabilities, generate summary, create documentation, git code review before committing changes etc. 
It can use OpenAI api, Azure OpenAI api and local hosted opensource apis for llms like Llama2, mistral etc.
You can try using importing vsix file as extension. It is based on other open source VS Code Extesnion code, please use on your own risk. It is very experimanetal and motivation is to just share code and show as proof of concept.
You can use this code and enhance based on your needs.

## Features

- Code Generation
- Code Documentation
- Code Summary
- Find Code Problems and Vulnerabilities
- Git Code review
- User Feedback Entry and Report
- Support OpenAI, Azure OpenAI and any Open source LLMs(using ollama and litellm) - install both and run ollama server and then litellm --model ollama/mistral # or any other model

## Requirements

You need to use VSCODE and need to have one of the setup - OpenAI(keys) or Azure OepnAI setup or local LLm setup based on ollama and litellm

## Extension Settings

In VSCode settings - search for DevOps and you will find setting page for this extension, please provide necessary information to make it work.

## Known Issues

This is just my weekend project, so please use on your risk.

## Release Notes

### 1.0.0


## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
