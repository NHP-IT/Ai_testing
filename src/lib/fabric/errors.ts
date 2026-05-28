export class MissingConnectionValueError extends Error {
  constructor(valueName: string) {
    super(`${valueName} is not configured in testing connections.`);
    this.name = "MissingConnectionValueError";
  }
}

export class FabricRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseText: string
  ) {
    super(message);
    this.name = "FabricRequestError";
  }
}
