import {Timestamp} from '../domain/types'

export class Timekeeper {
  static now(): Timestamp {
    return new Date().toISOString()
  }
}
