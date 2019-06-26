class XML {

    constructor (questions) {
        this.questions = questions;
    }
  
    /**
     * Retrieve XML for exam.
     */
    getXML() {
        var content = this.getHeader();
        for (var i = 0; i < this.questions.length; i++) {
        content = content + this.getQuestionXML(i) + "\n\n";
        }
        content = content + this.getFooter();
        return content;
    }
  
    /**
     * Add header to document
     */
    getHeader() {
        var content = '<?xml version="1.0" encoding="UTF-8"?><quiz>';
        content = content + '<question type="category"><category><text>Testing Category</text></category></question>';
        return content;
    }
  
    /**
     * Add footer to document
     */
    getFooter() {
        return '</quiz>';
    }
  
    escapeXML(content) {
        return content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }

    /**
     * Retrieve the XML for a question.
     */
    getQuestionXML(index) {
        var content = "";
        content = content + '<question type="' + this.questions[index].getType() + '">';
        content = content + '<name><text>' + this.getQuestionName(index) + '</text></name>';
        content = content + '<questiontext format="html"><text><![CDATA[' + this.questions[index].getQuestionText() + ']]></text></questiontext>';
        var feedback = this.questions[index].getFeedback();
        if (feedback.length > 0) {
        content = content + '<generalfeedback format="html"><text><![CDATA[' + this.escapeXML(feedback) + ']]></text></generalfeedback>';
        }
        content = content + '<defaultgrade>1.0000000</defaultgrade><penalty>0.3333333</penalty><hidden>0</hidden><shuffleanswers>0</shuffleanswers>';
        // NEEDS TAG
        if (this.questions[index].getType() == 'multichoice') {
        content = content + '<answernumbering>abc</answernumbering>';
        content = content + '<single>true</single>';
        }
        content = content + this.getResponsesXML(index);
        content = content + '</question>';
        return content;
    }
  
    /**
     * Retrieve the XML for the responses.
     */
    getResponsesXML(index) {
        var content = "";
        var responses = this.questions[index].getResponses();
        var answers = this.decodeAnswers(this.questions[index].getType(), this.questions[index].getCorrectAnswers());
        for (var i = 0; i < responses.length; i++) {
        content = content + '<answer fraction="' + this.isCorrect(i, answers).toString() + '" format="html"><text>' + this.escapeXML(responses[i]) + '</text></answer>';
        }
        return content;
    }
    
    /**
     * Retreive question name
     */
    getQuestionName(index) {
        var name = this.questions[index].getQuestionText().replace(/<br\/>/g, ' ');
        name = name.replace(/<[^>]+>/g, '');
        return "Q" + (index+1).toString().padStart(3, '0') + this.escapeXML(name.substring(0, 100));
        // return Utilities.formatString('Q%03d: %s', index+1, this.escapeXML(name.substring(0, 100)));
    }
  
    /**
     * Check whether answer is correct
     */
    isCorrect(index, answers) {
        if (answers.indexOf(index) != -1) {
        return 100;
        }
        return 0;
    }
  
    /**
     * Decode answers (letter -> number)
     */
    decodeAnswers(type, answers) {
        var correct = [];
        for (var i = 0; i < answers.length; i++) {
        if (type == "multichoice" || type == "multichoiceset") {
            correct.push(answers[i].toLowerCase().charCodeAt(0) - 97);
        }
        }
        return correct;
    }
};

module.exports = {xml: XML};