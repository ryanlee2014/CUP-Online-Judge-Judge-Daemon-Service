class JudgeManager {
  submissionInfo = {

  };
  buildSubmissionInfo(solutionId) {
    return this.submissionInfo[solutionId] || {};
  }

  updateSubmissionInfo (solutionId: string, payload: any) {
    this.submissionInfo[solutionId] = payload;
  }
}

export default new JudgeManager();
