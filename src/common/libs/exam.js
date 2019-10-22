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
        this.questionIndex = -1;
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
        var html = child.innerHTML;

        switch (this.state) {
            case "header":
                var type = this._getType(html);
                if (type) {
                    this._createQuestion(type);
                    // console.log("in header, going to question via type");
                    break;
                }
                // List item -> new question.  Ignore any text between questions.
                if (this._isNumberedList(child)) {
                    this._createQuestion(type);
                    this.questions[this.questionIndex].addQuestionText('<p>' + html + '</p>');
                    // console.log("in header, going to question via numbered list");
                }
            break;
            case "question":
                var type = this._getType(html);
                if (type) {
                    this._createQuestion(type);
                    // console.log('in question, going to new question via type');
                    break;
                }
                if (this._checkForFeedback(html)) {
                    // console.log('in question, found feedback');
                    break;
                }
                if (this._isAlphaList(child)) {
                    // console.log('in question, going to responses');
                    this.state = "responses";
                    this.questions[this.questionIndex].addResponse(html);
                } else {
                    if (this._isNumberedList(child) && this.questions[this.questionIndex].getQuestionText() !== "") {
                        // console.log('found numbered list');
                        // console.log(this.questions[this.questionIndex].getType());
                        if (!(this.questions[this.questionIndex].getType() == 'multichoice' || this.questions[this.questionIndex].getType() == 'multichoiceset')) {
                            // console.log('in question, adding new question');
                            this._createQuestion("MC");
                            this.questions[this.questionIndex].addQuestionText('<p>' + html + '</p>');
                            break;
                        }
                    }
                    // console.log('in question, adding more text');
                    if (html.replace(/<[^>]*>/g, "").trim()) {
                        this.questions[this.questionIndex].addQuestionText('<p>' + html + '</p>');
                    }
                }
                break;
            case "responses":
                var type = this._getType(html);
                if (this._isNumberedList(child) || type) {
                    // console.log('in responses, going to new question');
                    this._createQuestion(type);
                    if (!type) {
                        this.questions[this.questionIndex].addQuestionText('<p>' + html + '</p>');
                    }
                    break;
                }
                if (this._isAlphaList(child)) {
                    // console.log('in responses, adding response');
                    this.questions[this.questionIndex].addResponse(html);
                    break;
                }
                // This part would be for paragraphs after a list item - is it needed?
                break;
            case "feedback":
                if (this._isAlphaList(child)) {
                    // console.log('in feedback, found response');
                    this.state = "responses";
                    this.questions[this.questionIndex].addResponse(html);
                } else {
                    // console.log('in feedback, adding feedback');
                    this.questions[this.questionIndex].addFeedback(html);
                }
                break;
            case "tag":
                break;
        }
    }

    /**
     * Check for a feedback entry for the element.
     *
     * @param {string} html the inner html of the element
     */
    _checkForFeedback(html) {
        var matches = html.match(/^\s*@\s*/g);
        if (matches != undefined) {
            this.state = "feedback";
            this.questions[this.questionIndex].addFeedback(html.replace(/^\s*@\s*/g, ""));
            return true;
        }
        return false;
    }

    /**
     * Create a new question.
     *
     * @param {string} type the question type
     */
    _createQuestion(type) {
        this.state = "question";
        this.questions.push(new Question);
        this.questionIndex++;
        if (type) {
            this.questions[this.questionIndex].setType(type);
        }
    }

    /**
     * Get the question type (if one exists) based on the html
     *
     * @param {string} html the inner html of the element
     */
    _getType(html) {
        var type = html.match(/^\s*Type:\s*/g);
        return (type) ? html.replace(/^\s*Type:\s*/g, "") : null;
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
            console.log(this.questionIndex);
            if (node.tagName == "OL") {
                for (var j = 0; j < node.children.length; j++) {
                    var answers = node.children[j].textContent.split(/[,\/]/);
                    for (var k = 0; k < answers.length; k++) {
                        this.questions[this.questionIndex].addAnswer(answers[k].trim());
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
