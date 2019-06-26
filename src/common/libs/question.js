class Question {

    /**
     * Currently unused.
     */
    constructor() {
        this.type = "multichoice";
        this.text = [];
        this.responses = [];
        this.feedback = [];
        this.answers = [];
    }
    
    /**
     * Add text to question - could probably use a type here (paragraph, list element, etc).
     */
    addQuestionText(text) {
      this.text.push(text);
    }
    
    /**
     * Add possible response to question
     */
    addResponse(response) {
      var index = this.responses.push(response);
      this._checkCorrect(response);
    }
    
    /**
     * Checks for "*" at the end of the response.
     */
    _checkCorrect(response) {
      var matches = response.match(/\s*\*\s*$/);
      if (matches != undefined) {
        this.addAnswer(String.fromCharCode(94+this.responses.length));
      }
    }
  
    /**
     * Add feedback to quesiton
     */
    addFeedback(feedback) {
      this.feedback.push(feedback);
    }
    
    /**
     * Add answer to question.
     */
    addAnswer(answer) {
      this.answers.push(answer);
      if (this.answers.length > 1 && this.type == "multichoice") {
        this.type = "multichoiceset";
      }
    }
    
    /**
     * Set type of question:
     * MC -> multiple choice
     * TF -> True or False
     * MR -> Multiple Response
     * FB -> Fill in the Blank
     * E|ES -> Essay
     * SA -> short answer
     */
    setType(type) {
  
      switch (type) {
        case "MC":
          this.type = "multichoice";
          break;
        case "TF":
          this.type = "truefalse";
          break;
        case "MR":
          this.type = "multichoiceset";
          break;
        case "FB":
        case "SA":
          this.type = "shortanswer";
          break;
        case "E":
        case "ES":
          this.type = "essay";
          break;
        default:
          this.type = "multichoice";
      }
    }
  
    /**
     * Get question text - join together paragraphs with <br/> for now - maybe <p> in future?
     */
    getQuestionText() {
      return this.text.join("");
    }
    
    /**
     * Get all possible responses.  This may not work with multi-line responses
     */
    getResponses() {
      return this.responses;
    }
    
    /**
     * Get all correct answers.
     */
    getCorrectAnswers() {
      return this.answers;
    }
  
    /**
     * Get all correct answers.
     */
    getFeedback() {
      return this.feedback.join(',');
    }
    
    /**
     * Get the question type.
     */
    getType() {
      return this.type;
    }
  
  };

  module.exports = {question: Question};