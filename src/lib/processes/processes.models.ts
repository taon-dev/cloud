export enum ProcessesState {
  /**
   * Process has not been started yet, only entity exists in the DB
   */
  NOT_STARTED = 'not-started',
  /**
   * child_process is being started
   */
  STARTING = 'starting',
  /**
   * Process is running and proper processActiveMessages displayed in
   * output (stdout / stderr)
   */
  ACTIVE = 'active',
  /**
   * Process is being killed
   */
  KILLING = 'killing',
  /**
   * Process killed after being active
   */
  KILLED = 'killed',
  /**
   * Process ended with error (exit code different than 0)
   */
  ENDED_WITH_ERROR = 'ended-with-error',
  /**
   * Process ended ok (exit code 0)
   */
  ENDED_OK = 'ended-ok',
}

export const ProcessesStatesAllowedStart: ProcessesState[] = [
  ProcessesState.NOT_STARTED,
  ProcessesState.KILLED,
  ProcessesState.ENDED_OK,
  ProcessesState.ENDED_WITH_ERROR,
];

export const ProcessesStatesAllowedStop: ProcessesState[] = [
  ProcessesState.STARTING,
  ProcessesState.ACTIVE,
];