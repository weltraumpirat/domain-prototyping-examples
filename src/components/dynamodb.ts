import {
  DynamoDBClient
} from '@aws-sdk/client-dynamodb'
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandOutput
} from '@aws-sdk/lib-dynamodb'
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb'

// lib-dynamodb doesn't export a named per-request type, so we declare the
// document-client-correct shape locally: native JS values, not the marshalled
// AttributeValue form the low-level client uses.
type WriteRequest = {
  PutRequest?: { Item: Record<string, NativeAttributeValue> }
  DeleteRequest?: { Key: Record<string, NativeAttributeValue> }
}

const TABLE_NAME = process.env.TABLE_NAME! // Inject table name as environment variable, e.g. via CDK
const MAX_BATCH_SIZE = 25            // DynamoDB BatchWriteItem caps a request at 25 items.
const MAX_RETRY_BACKOFF_MS = 1000    // Cap for exponential backoff between UnprocessedItems retries.

// Adaptive retry mode cushions per-call API throttling with exponential
// backoff and a client-side rate limiter — so we don't have to build our
// own retry around every send().
// Sadly, batch writes still need a loop, because BatchWriteItem
// reports per-row throttling via UnprocessedItems rather than by throwing.
const client = new DynamoDBClient({
  maxAttempts: 5,
  retryMode: 'adaptive'
})
const documentClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: false
  }
})

export type QueryConditions = {
  KeyConditionExpression: string,
  ExpressionAttributeNames?: Record<string, string>,
  ExpressionAttributeValues: Record<string, any>,
  IndexName?: string
}

export const dynamoDBQuery = async <T>(queryConditions: QueryConditions): Promise<T[]> => {
  function createQueryCommand() {
    return new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: queryConditions.IndexName,
      KeyConditionExpression: queryConditions.KeyConditionExpression,
      ExpressionAttributeNames: queryConditions.ExpressionAttributeNames,
      ExpressionAttributeValues: queryConditions.ExpressionAttributeValues,
      // GSIs only support eventually-consistent reads; main-table queries can stay strong.
      ConsistentRead: queryConditions.IndexName === undefined
    })
  }

  let all: T[] = []
  try {
    let output: QueryCommandOutput | undefined
    while (output === undefined || output?.LastEvaluatedKey !== undefined) {
      const queryCommand = createQueryCommand()
      if (output?.LastEvaluatedKey !== undefined) {
        queryCommand.input.ExclusiveStartKey = output?.LastEvaluatedKey!
      }
      output = await documentClient.send(queryCommand)
      all = all.concat(output.Items as T[])
    }
  } catch (e) {
    console.error({error: e})
    throw e
  }
  return all
}

export const dynamoDBScan = async <T>(filterExpression?: string, expressionAttributeValues?: Record<string, any>): Promise<T[]> => {
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues
  })
  let all: T[] = []
  try {
    let output: ScanCommandOutput | undefined
    do {
      if (output?.LastEvaluatedKey !== undefined) {
        scanCommand.input.ExclusiveStartKey = output.LastEvaluatedKey
      }
      output = await documentClient.send(scanCommand)
      all = all.concat(output.Items as T[])
    } while (output.LastEvaluatedKey !== undefined)
  } catch (e) {
    console.error({error: e})
    throw e
  }
  return all
}

// BatchWriteItem may return UnprocessedItems when DynamoDB couldn't process
// the whole batch (typically due to per-partition throttling). The documented
// remedy is to retry just the unprocessed slice with backoff until it's
// empty. We don't return until every row was successfully saved.
async function loopedWrite(requests: WriteRequest[]): Promise<void> {
  let pending = requests
  let attempt = 0
  while (pending.length > 0) {
    const command = new BatchWriteCommand({
      RequestItems: { [TABLE_NAME]: pending }
    })
    const output = await documentClient.send(command)
    const unprocessed = (output.UnprocessedItems?.[TABLE_NAME] ?? []) as WriteRequest[]
    if (unprocessed.length === 0) return
    pending = unprocessed
    const backoff = Math.min(MAX_RETRY_BACKOFF_MS, 50 * Math.pow(2, attempt++))
    await new Promise(resolve => setTimeout(resolve, backoff))
  }
}

async function writeBatch(batch: any[]): Promise<void> {
  const requests: WriteRequest[] = batch.map(item => ({
    PutRequest: {
      Item: item
    }
  }))
  await loopedWrite(requests)
}

export const dynamoDBBatchWrite = async (items: any[]): Promise<void> => {
  const queue = [...items]   // don't mutate the caller's array
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_BATCH_SIZE)
    await writeBatch(batch)
  }
}

async function deleteBatch(batch: any[]): Promise<void> {
  const requests: WriteRequest[] = batch.map(item => ({
    DeleteRequest: {
      Key: {
        PK: item.PK,
        SK: item.SK
      }
    }
  }))
  await loopedWrite(requests)
}

export const dynamoDBBatchDelete = async (items: any[]): Promise<void> => {
  const queue = [...items]   // don't mutate the caller's array
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_BATCH_SIZE)
    await deleteBatch(batch)
  }
}
