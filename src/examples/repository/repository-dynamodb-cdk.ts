
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

// noinspection JSUnusedGlobalSymbols
export class ShoppingCartsTableStack extends Stack {
  readonly table: Table

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.table = new Table(this, 'ShoppingCartsTable', {
      partitionKey:  { name: 'PK', type: AttributeType.STRING },
      sortKey:       { name: 'SK', type: AttributeType.STRING },
      billingMode:   BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN
    })

    // GSI for findAllByCustomerId. Every row of an Order carries customerId
    // (denormalized), so the Query returns the entire aggregate set for that
    // customer in a single round trip. ProjectionType.ALL means rows come
    // back fully populated — no second GetItem trip required.
    this.table.addGlobalSecondaryIndex({
      indexName:      'byCustomer',
      partitionKey:   { name: 'customerId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL
    })
  }
}

// Wire the table to any Lambda that uses the convenience functions:
//   ordersHandler.addEnvironment('TABLE_NAME', table.tableName)
//   table.grantReadWriteData(ordersHandler)
