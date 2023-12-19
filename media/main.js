(function () {
  const vscode = acquireVsCodeApi();
  document.getElementById("rating-ele").style.visibility = "hidden";
  document.getElementById("feedback-view").style.visibility = "hidden";
  let response = '';
  let feedbackSubmitted = false;

  window.addEventListener("message", (event) => {
    document.getElementById("rating-ele").style.visibility = "hidden";
    document.getElementById("feedback-view").style.visibility = "hidden";
    document.getElementById('rating-ele').children[1].classList.remove('active');
    document.getElementById('rating-ele').children[0].classList.remove('active');
    feedbackSubmitted = false;
    const message = event.data;
    switch (message.type) {
      case "addResponse": {
        document.getElementById("response").style.visibility = "visible";
        response = message.value;
        setResponse();
        break;
      }
      case "clearResponse": {
        response = '';
        break;
      }
      case "setPrompt": {
        document.getElementById("prompt-input").value = message.value;
        break;
      }
      case "feedbackView": {
        document.getElementById("rating-ele").style.visibility = "hidden";
        document.getElementById("response").innerHTML = "";
        document.getElementById("feedback-view").style.visibility = "visible";
        processFeedback(message.value);
        break;
      }
    }
  });

  function fixCodeBlocks(response) {
    const REGEX_CODEBLOCK = new RegExp('\`\`\`', 'g');
    const matches = response.match(REGEX_CODEBLOCK);
    const count = matches ? matches.length : 0;
    if (count % 2 === 0) {
      return response;
    } else {
      return response.concat('\n\`\`\`');
    }
  }

  function processFeedback(feedbackData) {
    let total_postive = 0;
    let total_negative = 0;
    let chartData = {};
    let models = [];
    let cats = [];

    feedbackData.split('\n').forEach((data) => {
    document.getElementById("feedback-view").innerHTML = "";

      const feedback = data.split("||--||");
      const date = feedback[0];
      const prompt = feedback[1];
      const response = feedback[2];
      const rating = feedback[3];
      const model = feedback[4];
      const category = feedback[5];
      if(chartData['total_postive'] === undefined){
        chartData['total_postive'] = 0;
      }
      if(chartData['total_negative'] === undefined){
        chartData['total_negative'] = 0;
      }
      if(chartData[model] === undefined){
        chartData[model] = {};
        models.push(model);
      }
      if(chartData[category] === undefined){
        chartData[category] = {};
        cats.push(category);
      }

      if(chartData[model]['total_postive'] === undefined){
        chartData[model]['total_postive'] = 0;
      }

      if(chartData[model]['total_negative'] === undefined){
        chartData[model]['total_negative'] = 0;
      }

      if(chartData[category]['total_postive'] === undefined){
        chartData[category]['total_postive'] = 0;
      }

      if(chartData[category]['total_negative'] === undefined){
        chartData[category]['total_negative'] = 0;
      }

      if(rating === 'positive') {
        chartData['total_postive'] ++;
        chartData[category]['total_postive']++;
        chartData[model]['total_postive']++;
      }else {
        chartData['total_negative']++;
        chartData[category]['total_negative']++;
        chartData[model]['total_negative']++;
      }
    });
    const ratingEle = document.createElement("div");
    let innerHTML = `<div id="pie-main"><table class="charts-css pie"><caption> Overall Performance : </caption> <tbody><tr><td style="--start: 0.0; --end: ${(chartData.total_postive/(chartData.total_negative + chartData.total_postive)).toFixed(1)}; --color: green;"><span class="data"  style="color:white;"> POSITIVE : ${(100 * (chartData.total_postive/(chartData.total_negative + chartData.total_postive))).toFixed(2)} </span></td></tr><tr><td style="--start: ${(chartData.total_postive/(chartData.total_negative + chartData.total_postive)).toFixed(1)}; --end: 1.0; --color: red;"><span class="data" style="color:white;"> NEGATIVE : ${(100*(chartData.total_negative/(chartData.total_negative + chartData.total_postive))).toFixed(2)} </span></td></tr></tbody></table><div>`;
    innerHTML  =  innerHTML  ;
    let html1 = `<div id="bar-main"><table class="charts-css column multiple show-labels show-data-axes data-spacing-20 datasets-spacing-4"><caption> Model Performance </caption> 
                  <thead><tr><th scope="col"> Model </th> <th scope="col"> Progress 1 </th> <th scope="col"> Progress 2 </th></tr></thead> 
                  <tbody>`;
    models.forEach((model) => {
      html1 = html1 + `<tr><th scope="row"> ${model.charAt(0).toUpperCase() + model.slice(1)} </th> <td style="--size: ${(chartData[model]['total_postive'])/((chartData[model]['total_postive'] + chartData[model]['total_negative'])).toFixed(1)}; --color: green;"><span class="data"> ${chartData[model]['total_postive']} </span></td> <td style="--size: ${(chartData[model]['total_negative'])/((chartData[model]['total_postive'] + chartData[model]['total_negative'])).toFixed(1)}; --color: red;"><span class="data"> ${chartData[model]['total_negative']} </span></td>  </tr> `;
    });
    html1 = html1 + ` </tbody></table></div>`;

    let html2 = `<div id="bar-main"><table class="charts-css column multiple show-labels show-data-axes data-spacing-20 datasets-spacing-4"><caption> Model Performance </caption> 
                  <thead><tr><th scope="col"> Model </th> <th scope="col"> Progress 1 </th> <th scope="col"> Progress 2 </th></tr></thead> 
                  <tbody>`;
    cats.forEach((cat) => {
      html2 = html2 + `<tr><th scope="row"> ${cat.charAt(0).toUpperCase() + cat.slice(1)} </th> <td style="--size: ${(chartData[cat]['total_postive'])/((chartData[cat]['total_postive'] + chartData[cat]['total_negative'])).toFixed(1)}; --color: green;"><span class="data"> ${chartData[cat]['total_postive']} </span></td> <td style="--size: ${(chartData[cat]['total_negative'])/((chartData[cat]['total_postive'] + chartData[cat]['total_negative'])).toFixed(1)}; --color: red;"><span class="data"> ${chartData[cat]['total_negative']} </span></td>  </tr> `;
    });
    html2 = html2 + ` </tbody></table></div>`;


    ratingEle.innerHTML  = innerHTML + "<br><br>" + html1 + "<br><br>" + html2  + "<br><br>";
    document.getElementById("feedback-view").appendChild(ratingEle);
    console.log(chartData.total_postive/(chartData.total_negative + chartData.total_postive));
    console.log(chartData);
  }
  function setResponse() {
    var converter = new showdown.Converter({
      omitExtraWLInCodeBlocks: true,
      simplifiedAutoLink: true,
      excludeTrailingPunctuationFromURLs: true,
      literalMidWordUnderscores: true,
      simpleLineBreaks: true
    });
    response = fixCodeBlocks(response);
    html = converter.makeHtml(response);
    document.getElementById("response").innerHTML = html;

    var preCodeBlocks = document.querySelectorAll("pre code");
    for (var i = 0; i < preCodeBlocks.length; i++) {
      preCodeBlocks[i].classList.add(
        "p-2",
        "my-2",
        "block",
        "overflow-x-scroll"
      );
    }

    var codeBlocks = document.querySelectorAll('code');
    for (var i = 0; i < codeBlocks.length; i++) {
      // Check if innertext starts with "Copy code"
      if (codeBlocks[i].innerText.startsWith("Copy code")) {
        codeBlocks[i].innerText = codeBlocks[i].innerText.replace("Copy code", "");
      }

      codeBlocks[i].classList.add("inline-flex", "max-w-full", "overflow-hidden", "rounded-sm", "cursor-pointer");

      codeBlocks[i].addEventListener('click', function (e) {
        e.preventDefault();
        vscode.postMessage({
          type: 'codeSelected',
          value: this.innerText
        });
      });

      const d = document.createElement('div');
      d.innerHTML = codeBlocks[i].innerHTML;
      codeBlocks[i].innerHTML = null;
      codeBlocks[i].appendChild(d);
      d.classList.add("code");
      document.getElementById("rating-ele").style.visibility = "visible";
    }

    microlight.reset('code');

  }

  document.getElementById('prompt-input').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      vscode.postMessage({
        type: 'prompt',
        value: this.value
      });
    }
  });

  document.getElementById('rating-ele').children[0].addEventListener('click', function (e) {
    if (feedbackSubmitted === false) {
      document.getElementById('rating-ele').children[1].classList.remove('active');
      document.getElementById('rating-ele').children[0].classList.remove('active');
      vscode.postMessage({
        type: 'feedbackPlus',
        value: (new Date()).toISOString() + "||--||" + document.getElementById('prompt-input').value.replace(/\r?\n/g, "<new-line>") + "||--||" + document.getElementById("response").innerText.replace(/\r?\n/g, "<new-line>") + "||--||" + 'positive'
      });
      document.getElementById('rating-ele').children[0].classList.add('active');
      feedbackSubmitted = true;
    }
  });

  document.getElementById('rating-ele').children[1].addEventListener('click', function (e) {
    if (feedbackSubmitted === false) {
      document.getElementById('rating-ele').children[1].classList.remove('active');
      document.getElementById('rating-ele').children[0].classList.remove('active');
      vscode.postMessage({
        type: 'feedbackNegative',
        value: (new Date()).toISOString() + "||--||" + document.getElementById('prompt-input').value.replace(/\r?\n/g, "<new-line>") + "||--||" + document.getElementById("response").innerText.replace(/\r?\n/g, "<new-line>") + "||--||" + 'negative'
      });
      document.getElementById('rating-ele').children[1].classList.add('active');
      feedbackSubmitted = true;
    }
  });

})();
