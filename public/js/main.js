var elem = document.getElementById("questions-json");
var qnSet = elem.innerHTML;
elem.parentNode.removeChild(elem);

function decodeHTMLEntities(text) {
  var textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  textArea.innerHTML = textArea.value;
  return textArea.value;
}

qnSet = JSON.parse(qnSet);

score = 0;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function setQuizButtons(i) {
  var s = "";
  if (i != qnSet.length - 1) {
    s +=
      '<br><button id="next-button" class="btn btn-success" disabled="true" onclick="start(' +
      (i + 1).toString() +
      ')">Next</button>';
  }

  return s;
}

function setOptions(options, i) {
  var s = "";
  shuffle(options);
  for (var x = 0; x < options.length; x++) {
    options[x] = decodeHTMLEntities(options[x]);
    s += '<div class="options options-enabled">' + options[x] + "</div>";
  }
  var buttonsHTML = setQuizButtons(i);
  s += buttonsHTML;
  return s;
}

function start(i) {
  // console.log(qnSet[i].correct_answer);
  var parent = document.getElementById("question-area");

  var div = document.createElement("div");
  div.setAttribute("id", "q" + (i + 1).toString());
  div.setAttribute("class", "questions");
  try {
    var h3 = document.createElement("h3");
    h3.innerHTML =
      "Question " +
      (i + 1).toString() +
      '<span id="totalQuestions"> / ' +
      qnSet.length.toString() +
      " </span>";
    div.appendChild(h3);
    var p = document.createElement("p");
    p.innerHTML = "<br>" + decodeHTMLEntities(qnSet[i].question.toString());
    div.appendChild(p);
    qnSet[i].incorrect_answers.push(qnSet[i].correct_answer);
    div.innerHTML += setOptions(qnSet[i].incorrect_answers, i);

    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
    parent.appendChild(div);

    $(".options").click(function (event) {
      if (i != qnSet.length - 1)
        document.getElementById("next-button").disabled = false;

      if (
        event.target.innerHTML == decodeHTMLEntities(qnSet[i].correct_answer)
      ) {
        $(this).addClass("correct-answer");
        score += 1;
      } else {
        $(this).addClass("wrong-answer");
        var arr = document.getElementsByClassName("options");
        for (var j = 0; j < arr.length; j++) {
          if (arr[j].innerHTML == decodeHTMLEntities(qnSet[i].correct_answer)) {
            arr[j].classList.add("correct-answer");
          }
        }
      }

      if (i === qnSet.length - 1) {
        var lastDiv = document.getElementById("q" + qnSet.length.toString());
        lastDiv.innerHTML +=
          '<form action="/finish" method="post"><input name="score" type="text" value="' +
          ((score * 100) / qnSet.length).toFixed(0).toString() +
          '" style="display:none;position:absolute"><button id="finish-quiz-button" type="submit" class="btn btn-warning">Finish Quiz</button></form>';
      }

      $(".options").removeClass("options-enabled");
      $(".options").off("click");
    });
  } catch (err) {
    console.log("Unsupported file error.");
    alert("Some error occured. Please contact the admin.");
  }
}
