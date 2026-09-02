// noinspection JSUnusedLocalSymbols

export class NotFoundException extends Error {
  private readonly type = 'NOT_FOUND'
  private readonly httpCode = '404'

  constructor(msg: string) {
    super(msg)
  }
}

export class InvalidInputException extends Error {
  private readonly type = 'INVALID_INPUT'
  private readonly httpCode = '400'

  constructor(msg: string) {
    super(msg)
  }
}


export class InvalidStateException extends Error {
  private readonly type = 'INVALID_STATE'
  private readonly httpCode = '409'

  constructor(msg: string) {
    super(msg)
  }
}
