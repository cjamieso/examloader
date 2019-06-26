const Question = require('./question.js').question;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

/**
 * Things to process:
 * -question type (matching + drag & drop -> requires new state machine)
 * -tags
 *
 * Few thoughts:
 * -Ideally we would remove the blank lines in the questions/answer and let moodle handle the typesetting - maybe use paragraph tags?
 */
class Exam {

    constructor(html) {
        this.html = html;
        this.state = "header";
        this.questions = [];
        this.questionIndex = 0;
        const dom = new JSDOM(this.html);
        this.document = dom.window.document;
        this._cleanExam();
    }
    
    /**
     * Return the questions in the exam.
     */
    getQuestions() {
      return this.questions;
    }

    /**
     * This function removes most of the formatting found in spans.  It looks for:
     * -bold tags
     * (should italics be here too?  what about superscript or subscript?)
     */
    _cleanExam() {
        var spans = $(this.document.body).find('span');
        for (var i = 0; i < spans.length; i++) {
            // Empty content node - delete.
            if (!spans[i].innerHTML.trim()) {
                spans[i].remove();
                continue;
            }
            var weight = spans[i].style.getPropertyValue('font-weight');
            if (weight >= 700) {
                $(spans[i]).replaceWith("<strong>" + spans[i].innerHTML + "</strong>");
            } else {
                // var parent = spans[i].parentNode;
                $(spans[i]).contents().unwrap();
            }
        }
    }

    /**
     * Parse an exam into a set of questions.
     */
    parse() {
        for (var i = 0; i < this.document.body.childNodes.length; i++) {
            var node = this.document.body.childNodes[i];
            if (node.textContent.toLowerCase().replace(/\s|:|-/g, "") == "answers") {
                this.processAnswers(i);
                break;
            }
            if (node.tagName == 'OL') {
                for (var j = 0; j < node.children.length; j++){
                    this.processElement(node.children[j]);
                }
            } 
            else {
                this.processElement(node);
            }
        }
        console.log(this.questions);
    }

    /**
     * Determine the type of list in a google doc parsed into HTML.
     * 
     * @param {object} document check styles in this document
     * @param {string} listID the list ID in the google doc
     */
    _getListType(document, listID) {
        var rules = document.styleSheets[0].cssRules;
        for (var i = 1; i < rules.length; i++) {
            var text = rules[i].cssText;
            var reg = new RegExp('lst-kix_list_' + listID + '\\s*>\\s*li:before', 'g');
            var matches = text.match(reg);
            if (matches !== null) {
                if (text.match(/lower-latin/g)) {
                    return "lowerlatin";
                }
                var decimal = text.match(/decimal/g);
                if (decimal !== null) {
                    return "decimal";
                }
                var upperLatin = text.match(/upper-latin/g);
                if (upperLatin != null) {
                    return "upperlatin";
                }
            }
        }
    }

    /**
     * Process an element on the exam.  Still doesn't yet consider:
     * -images
     * -tables
     *
     * @param {object} child the element to process
     */
    processElement(child) {
        // this._cleanElement(child);
        var html = child.innerHTML;
        
        switch (this.state) {
            case "header":
                // List item -> new question.  Ignore any text between questions.
                if (this._isNumberedList(child)) {
                    this.state = "question";
                    this.questions.push(new Question);
                    this.questions[this.questionIndex].addQuestionText('<p>' + html + '</p>');
                }
            break;
            case "question":
                var matches = html.match(/^\s*@\s*/g);
                if (matches != undefined) {
                    this.state = "feedback";
                    this.questions[this.questionIndex].addFeedback(html.replace(/^\s*@\s*/g, ""));
                    break;
                }
                if (this._isAlphaList(child)) {
                    this.state = "responses";
                    this.questions[this.questionIndex].addResponse(html);
                } else {
                    if (html.replace(/<[^>]*>/g, "").trim()) {
                    this.questions[this.questionIndex].addQuestionText('<p>' + html + '</p>');
                    }
                }
                break;
            case "responses":
                var type = html.match(/^\s*Type:\s*/g);
                if (this._isNumberedList(child) || (type != undefined)) {
                    this.state = "question";
                    this.questions.push(new Question);
                    this.questionIndex++;
                    if (type == undefined) {
                        this.questions[this.questionIndex].addQuestionText('<p>' + html + '</p>');
                        this.questions[this.questionIndex].setType("MC");
                    } else {
                        this.questions[this.questionIndex].setType(html.replace(/^\s*Type:\s*/g, ""));
                    }
                    break;
                }
                if (this._isAlphaList(child)) {
                    this.questions[this.questionIndex].addResponse(html);
                    break;
                }
                // This part would be for paragraphs after a list item - is it needed?
                break;
            case "feedback":
                if (this._isAlphaList(child)) {
                    this.state = "responses";
                    this.questions[this.questionIndex].addResponse(html);
                } else {
                    this.questions[this.questionIndex].addFeedback(html);
                }
            break;
            case "tag":
            break;
        }
    }

    /**
     * Check to see if the node is the part of a numbered list
     */
    _isNumberedList(node) {
      
        if (node.tagName === "LI" && this._getListType(node) === 'decimal') {
            return true;
        }
        return false;
    }
  
    /**
     * Check to see if the ndoe is part of an alphabetized list
     */
    _isAlphaList(node) {
        if (node.tagName === "LI" && (this._getListType(node) === 'lowerlatin' || this._getListType(node) === "upperlatin")) {
            return true;
        }
        return false;
    }

    /**
     * Determine the type of list in a google doc parsed into HTML.
     * 
     * @param {object} child the li element to find the list ID for
     */
    _getListType(child) {
        var listID = child.parentNode.className.match(/\d{1,3}-\d{1,3}/g);
        var rules = this.document.styleSheets[0].cssRules;
        for (var i = 1; i < rules.length; i++) {
            var text = rules[i].cssText;
            var reg = new RegExp('lst-kix_list_' + listID + '\\s*>\\s*li:before', 'g');
            var matches = text.match(reg);
            if (matches !== null) {
                if (text.match(/lower-latin/g)) {
                    return "lowerlatin";
                }
                var decimal = text.match(/decimal/g);
                if (decimal !== null) {
                    return "decimal";
                }
                var upperLatin = text.match(/upper-latin/g);
                if (upperLatin != null) {
                    return "upperlatin";
                }
            }
        }
    }

    /**
     * Process "Answers:" section at the end of the document
     */
    processAnswers(childIndex) {
        var totalElements = this.document.body.childNodes.length;
        var oldIndex = this.questionIndex;
        this.questionIndex = 0;
        
        for (var i = childIndex + 1; i < totalElements; i++) {
            var node = this.document.body.childNodes[i];
            if (node.tagName == "OL") {
                for (var j = 0; j < node.children.length; j++) {
                    var answers = node.children[j].textContent.replace(/\s*/g, "").split(',');
                    for (var k = 0; k < answers.length; k++) {
                        this.questions[this.questionIndex].addAnswer(answers[k]);
                    }
                    this.questionIndex++;
                }
                break;
            }
        }
        this.questionIndex = oldIndex;
    }
  
  };

  module.exports = {exam: Exam};
