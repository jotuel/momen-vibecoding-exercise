# Momen.app Rules — Combined

This document consolidates all rule files originally stored under `.cursor/rules` into a single Markdown file. Each section below corresponds to an original rule file. The original file names and their YAML frontmatter (when present) are preserved at the top of each section.

---

## Table of contents

1. momen-backend-architecture.mdc
2. momen-actionflow-gql-api-rules.mdc
3. momen-ai-agent-gql-api-rules.mdc
4. momen-binary-asset-upload-rules.mdc
5. momen-database-gql-api-rules.mdc
6. momen-stripe-payment-rules.mdc
7. momen-tpa-gql-api-rules.mdc

---

## 1) momen-backend-architecture.mdc

---
description: Momen.app's architecture when used as a headless backend-as-a-service (BaaS)
alwaysApply: true
---

# Momen.app

Momen is a full-stack no-code development platform, but its backend architecture is designed to be used headlessly. This allows building completely custom frontend applications while leveraging Momen as a pure backend-as-a-service (BaaS).

## Core Architecture

* **Database**: A powerful, enterprise-grade relational database built on PostgreSQL. This provides the foundation for structured data, relationships, and constraints.
* **Actionflow**: For building custom workflows and automations.
* **Third-party API**: Imported third-party HTTP API definitions, the server acts as a relay. 
* **AI Agent**: AI agent builder / runtime capable of RAG, tool use (depending on model), multi-modal input/output (dpending on model), structured JSON output (depending on model). 
* **GraphQL**: All backend interactions, including data operations and business logic execution, are exposed through a single, unified GraphQL API. There are no traditional REST endpoints for data CRUD operations.
  - **HTTP URL**:  https://villa.momen.app/zero/{projectExId}/api/graphql-v2
  - **WebSocket URL**: wss://villa.momen.app/zero/{projectExId}/api/graphql-subscription

## Communicating with the backend
When using Typescript, to communicate with a Momen.app project's backend server's GraphQL API, use Apollo GraphQL + subscriptions-transport-ws. 

### Reference Implementation
```typescript
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { WebSocketLink } from '@apollo/client/link/ws';
import { SubscriptionClient } from 'subscriptions-transport-ws';

const httpUrl = 'https://villa.momen.app/zero/{projectExId}/api/graphql-v2';
const wssUrl = 'wss://villa.momen.app/zero/{projectExId}/api/graphql-subscription';

export const createApolloClient = (token?: string) => {
  const wsClient = new SubscriptionClient(wssUrl, {
    reconnect: true,
    connectionParams: token ? {
      authToken: token // Anonymous users have no token, connectionParams must be empty. 
    } : {},
  });

  const wsLink = new WebSocketLink(wsClient);

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    new HttpLink({
      uri: httpUrl,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  });
};
```

For other languages, infer implementation from the above example.

## Authentication

All requests to the GraphQL endpoint are either authenticated, or they will be assigned an anonymous user role. When user changes authentication status (logging in/out), WebSocket connection should be re-established.

In order to obtain JWT, user must either register or login. Depending on the login settings of the project, it can have different authentication methods.

- Email with verification
  1. When registering, you must first send a verification code. Valid values for verificationEnumType are: LOGIN, SIGN_UP, BIND, UNBIND, DEREGISTER, RESET_PASSWORD. In this case, choose SIGN_UP.
     ```graphql
     mutation SendVerificationCodeToEmail(
         $email: String!
         $verificationEnumType: verificationEnumType!
     ) {
         sendVerificationCodeToEmail(
         email: $email
         verificationEnumType: $verificationEnumType
         )
     }
     ```
  2. When registering, set `register` to true, and fill in the `verificationCode`. When logging in subsequently, set `register` to false and omit `verificationCode`.
     ```graphql
     mutation AuthenticateWithEmail(
         $email: String!
         $password: String!
         $verificationCode: String
         $register: Boolean!
     ) {
         authenticateWithEmail(
         email: $email
         password: $password
         verificationCode: $verificationCode
         register: $register
         ) {
             account {
                 id
                 permissionRoles
             }
             jwt {
                 token
             }
         }
     }
     ```

- Username and password
  ```graphql
  mutation AuthenticateWithUsername(
    $username: String!
    $password: String!
    $register: Boolean!
  ) {
    authenticateWithUsername(
      username: $username
      password: $password
      register: $register
    ) {
      account {
        id
        permissionRoles
      }
      jwt {
        token
      }
    }
  }
  ```

N.B. both authentication mutations return `FZ_Account` type, which is not the same as the `account`. `FZ_Account` ONLY has these fields: `email: String`, `id: Long`, `permissionRoles: [String]`, `phoneNumber: String`, `profileImageUrl: String`, `roles: [FZ_role]`, `username: String`. Other fields in `account` are NOT found in `FZ_Account`.

## Interacting with the GraphQL API
The GraphQL API is automatically generated by Momen.app depending on the structure of the backend. `Long` and `bigint` are sometimes used to represent corresponding fields of similar types, such as `FZ_Account`'s id (long) and account's id (bigint), but the exact type must be chosen depending on the type involved in the query. Inputs of `Json` type must be passed in as variables. e.g.

```graphql
mutation CreateOrder($args: Json!) {
  fz_invoke_action_flow(
    actionFlowId: "7e93e65e-7730-470c-b2fd-9ff608cb68e8"
    versionId: 5
    args: $args
  )
}
```

```json
{
  "variables": {
    "course_id": 2
  }
}
```

AVOID assembling args inside the query.

### Backend Structure Discovery
Use the Momen MCP server for discovery.

### Recommendations
- Database: Always ensure `momen-database-gql-api-rules` is read before writing code to interact with the database.
- Third-party API: Always ensure `momen-tpa-gql-api-rules` is read before writing code to interact with any Third-party APIs.
- Actionflow: Always ensure `momen-actionflow-gql-api-rules` is read before writing code to interact with any Actionflows.
- AI Agent: Always ensure `momen-ai-agent-gql-api-rules` is read before writing code to interact with any AI Agents.

### Subscriptions
For real-time functionality, the GraphQL API supports subscriptions. After establishing websocket, server acknowledges `connection_init` with:

```json
{
  "id": null,
  "type": "connection_ack",
  "payload": null
}
```

Then you may send `start` messages with GraphQL subscription operations. Responses use the standard GraphQL WebSocket semantics where `id` and `payload.data` are used.

## File / Binary Asset Handling
Media and other files are not stored in the PostgreSQL database but in dedicated Object Storage. When using them as input/parameter in other parts of the system, always use the corresponding id instead. URLs cannot be used as inputs in place of a file/image/video. When using a media file on the frontend, fetch its `url` subfield. Refer to `momen-binary-asset-upload-rules`.

## Permission
All GraphQL fields have permission control based on the current logged in user's role(s). If attempted access violates permission policies, an error will be given in the GraphQL response, typically with a 403 `errorCode`.

Example:
```json
{
  "errors": [
    {
      "errorCode": 403,
      "extensions": {
        "classification": "ACTION_FLOW"
      },
      "locations": [
        {
          "column": 2,
          "line": 2
        }
      ],
      "message": "Anonymous user has no permission on invocation of action flow: 63734821-319d-4f00-a5cf-69f134b42b9c",
      "operation": "fz_invoke_action_flow",
      "path": [
        "fz_invoke_action_flow"
      ]
    }
  ]
}
```

---

## 2) momen-actionflow-gql-api-rules.mdc

---
description: How to interact with complex / multi-step backend logic using actionflows in momen.app's backend.
alwaysApply: false
---

# Momen.app Actionflow

## Overview
Although momen.app supports direct CRUD operations from the frontend, many backend operations are multi-step, long-running, or asynchronous. Momen.app supports actionflows for these scenarios. An actionflow is a directed acyclic graph made up of actionflow nodes. Nodes represent operations (insert into database, invoke another actionflow) or control flow changes (condition and loop). Actionflows have special `input` and `output` nodes for arguments and return values of the entire actionflow.

Actionflows operate in two modes: sync and async.

- Sync: Executed in a single DB transaction — unexpected errors cause rollback. Runtime limits apply.
- Async: Each node runs inside a new DB transaction — no rollback, suited for long-running tasks like long HTTP calls to LLM APIs. AI agent invocation nodes can only be added inside async actionflows.

## Actionflow invocation process
To invoke an actionflow, obtain its id, argument list, and optionally a version from project schema. Invocation differs by type.

### Sync actionflows
Invoked via GraphQL mutation. Results returned in response.

Request:
```gql
mutation someOperationName ($args: Json!) {
 fz_invoke_action_flow(actionFlowId: "d3ea4f95-5d34-46e1-b940-91c4028caff5", versionId: 3, args: $args)
}
```

Example variables:
```json
{
  "args": {
    "yaml": "post_link:\n  url: \"https://momen.app\"\n",
    "img_id": 1020000000000111
  }
}
```

Response:
```json
{
  "data": {
    "fz_invoke_action_flow": {
      "img": {
        "id": 1020000000000090,
        "url": "https://fz-zion-static.functorz.com/.../image/636.jpg"
      },
      "url": "https://momen.app"
    }
  }
}
```

### Async actionflows
Triggered via GraphQL mutation, returns a `fz_create_action_flow_task` value (task id). Subscribe to the corresponding GraphQL subscription to receive results. There may be multiple subscription messages with intermediate statuses.

Example mutation:
```gql
mutation mh49tgie($args: Json!) {
 fz_create_action_flow_task(actionFlowId: "2a9068c5-8ee3-4dad-b3a4-5f3a6d365a2f", versionId: 4, args: $args)
}
```

Example variables:
```json
{
  "args": {
    "int": 123,
    "img_id": 1020000000000116,
    "some_text": "Dreamer",
    "datetime_with_timezone": "2025-10-23T20:13:00-07:00"
  }
}
```

Mutation response:
```json
{
  "data": {
    "fz_create_action_flow_task": 1150000000000148
  }
}
```

Subscription:
```gql
subscription fz_listen_action_flow_result($taskId: Long!) {
  fz_listen_action_flow_result(taskId: $taskId) {
    __typename
    output
    status
  }
}
```

There may be multiple subscription messages before the final `COMPLETED` message. Status transitions follow:

```java
switch (status) {
  case CREATED -> Set.of(PROCESSING);
  case PROCESSING -> Set.of(COMPLETED, FAILED);
  default -> Set.of();
};
```

---

## 3) momen-ai-agent-gql-api-rules.mdc

---
description: How to interact with Momen.app's AI Agent
alwaysApply: false
---

# Momen.app's AI agents

## Overview
Momen.app has an integrated AI agent builder supporting multi-modal (text, video, image) inputs/outputs, prompt templating, context fetching, tool use (actionflows, third-party APIs, other AI agents), and structured JSON output validated with JSONSchema. AI Agent invocations are asynchronous via GraphQL. Outputs may be streaming or non-streaming, structured or unstructured:

- Structured output: cannot be streamed and must include a JSONSchema.
- Unstructured plain text: may be streamed or non-streaming.

### Example AI Agent configuration
```json
{
    "id": "mgzzu8jp",
    "summary": "An example summary of what the agent does",
    "inputs": {
      "mgzzufo2": {
        "type": "VIDEO",
        "displayName": "the_video"
      },
      "mh4cjjcf": {
        "type": "TEXT",
        "displayName": "text"
      },
      "mh4cjkyv": {
        "type": "BIGINT",
        "displayName": "some_int"
      },
      "mh4cjoof": {
        "type": "array",
        "itemType": "IMAGE",
        "displayName": "images"
      }
    },
    "output": "Unstructured Text"
}
```

## Invocation process for streaming output
1. Start an AI conversation via mutation `fz_zai_create_conversation(inputArgs: $inputArgs, zaiConfigId: $zaiConfigId)`. The mutation returns a conversation id.
   - Binary asset inputs (image/video/file) require keys suffixed with `_id` and contain asset ids.
   - Example variables:
     ```json
     {
       "inputArgs": {
         "mgzzufo2_id": 1030000000000002,
         "mh4cjjcf": "Just some text",
         "mh4cjkyv": 23,
         "mh4cjoof_id": [1020000000000097, 1020000000000111, 1020000000000120]
       },
       "zaiConfigId": "mgzzu8jp"
     }
     ```
2. Subscribe to `fz_zai_listen_conversation_result(conversationId: $conversationId)` to receive incremental messages. Statuses may transition `IN_PROGRESS` → `STREAMING` → `COMPLETED`. The final `COMPLETED` message contains consolidated `data` (output) and possibly `images` (when model produces images).

Subscription fields available: `conversationId`, `status`, `reasoningContent`, `images`, `data`, `__typename`.

Streaming messages may provide partial `data` fragments; the final message consolidates them.

## Invocation process for non-streaming plain text
Same initial mutation to create conversation. There will be no `STREAMING` status messages — typically `IN_PROGRESS` then `COMPLETED` with final result.

## Invocation process for image-output models
Models that produce image outputs include `images` field in the `COMPLETED` message containing `FZ_Image` ids. Those ids reference Momen's binary asset system (see `momen-binary-asset-upload-rules`).

Example completed response with image:
```json
{
  "data": {
    "fz_zai_listen_conversation_result": {
      "__typename": "ConversationResult",
      "conversationId": 1494,
      "data": "I merged the three images into one, combining elements from each to create a new, unique image.\n",
      "images": [
        {
          "__typename": "FZ_Image",
          "id": 1020000000000164
        }
      ],
      "reasoningContent": null,
      "status": "COMPLETED"
    }
  }
}
```

## Invocation for structured output
Structured outputs always have an accompanying JSONSchema and cannot be streamed. The server sends a single `COMPLETED` message where `data` is a JSON satisfying the JSONSchema.

Example schema:
```json
{
  "output": {
    "type": "object",
    "properties": {
      "httpLink": {"type": "string"},
      "reasoning": {"type": "string"}
    },
    "required": ["httpLink","reasoning"]
  }
}
```

Example output:
```json
{
  "httplink": "https://www.google.com/calendar/event?...",
  "explanation": "No existing events were found on 2025-10-24 ... scheduled 08:00–08:10 ..."
}
```

---

## 4) momen-binary-asset-upload-rules.mdc

---
description: Handling of binary assets such as images, videos and files in momen.app's code component
alwaysApply: false
---

# Momen.app: Binary Asset Upload Protocol

This document describes the required protocol for uploading and referencing binary assets (images, videos, files) in Momen.app code components.

## Overview
All binary assets are stored on object storage services (e.g., S3). Their storage path is recorded in Momen's database. When referencing these assets in other tables, you must store only the asset's Momen ID, not its path or URL.

## Upload Workflow
A strict two-step process:

### Step 1: Obtain a Presigned Upload URL
1. Calculate the MD5 hash of the file (raw 128-bit), then Base64-encode it.
2. Call the appropriate GraphQL mutation to request a presigned upload URL:
   - `imagePresignedUrl` for images
   - `videoPresignedUrl` for videos
   - `filePresignedUrl` for other files

Provide:
- Base64-encoded MD5 hash
- File format/suffix (`MediaFormat`)
- (Optional) Access control (`CannedAccessControlList`)

Example GraphQL mutations:
```graphql
mutation GetImageUploadUrl($md5: String!, $suffix: MediaFormat!, $acl: CannedAccessControlList) {
  imagePresignedUrl(imgMd5Base64: $md5, imageSuffix: $suffix, acl: $acl) {
    imageId
    uploadUrl
    uploadHeaders
  }
}
```

`CannedAccessControlList` recommended value: `PRIVATE`.

`MediaFormat` includes values like `JPEG`, `PNG`, `MP4`, `PDF`, etc.

### Step 2: Upload the File and Use the Returned ID
1. Mutation response includes:
   - Asset unique ID
   - Presigned `uploadUrl`
   - Any `uploadHeaders`
2. Upload file using HTTP `PUT` to `uploadUrl` with raw file data and `uploadHeaders`.
3. Reference the returned ID in your data mutations (e.g., `cover_image_id: returnedImageId`).

This two-step process is mandatory.

---

## 5) momen-database-gql-api-rules.mdc

---
description: Momen.app's database architecture and how corresponding GraphQL schema is generated
alwaysApply: false
---

# Data Model Overview

The GraphQL schema is automatically generated directly from the user's data model. The following describes the general rules using an example `post` table and related tables.

### Example: post table (summary)
Columns:
- `id: bigint` (primary key)
- `created_at: timestamptz`
- `updated_at: timestamptz`
- `title: text`
- `content: text`
- `author_account: bigint` (FK to `account.id`)
- `cover_image: IMAGE` (composite media column stored as `cover_image_id`)

Constraints:
- `post_id_key` unique on `id`
- `post_pkey` primary key on `id`

Relationships (example)
- `post.post_tags` → `post_tag` (one-to-many)
- `post.meta` → `post_meta` (one-to-one)
- `account.posts` → `post` (one-to-many via `author_account`)

### Table & GraphQL generation summary
Each table generates:
- GraphQL object type (single record)
- Query fields: `<table>`, `<table>_by_pk`, `<table>_aggregate`
- Mutation fields: `insert_<table>`, `update_<table>`, `delete_<table>`, and single-record variants like `insert_<table>_one` and `update_<table>_by_pk`.

### Column type mappings
Primitive mapping examples:
- `text` → `String`
- `integer` → `Int`
- `bigint` → `bigint`
- `float8` → `Float8`
- `decimal` → `Decimal`
- `boolean` → `Boolean`
- `jsonb` → `jsonb`
- `geo_point` → `geography` (JSON Point)
- `timestamptz`, `timetz`, `date` map to corresponding GraphQL scalars

Composite media types:
- `image` → `FZ_Image` GraphQL object with `id`, `url(...)`, etc. Media columns stored physically as `${column}_id` long ids.

### System-managed columns
- `id`, `created_at`, `updated_at` are system-managed and not user-settable.

### Relationships
RelationMetadata determines referencing and referenced tables. `targetTable` is the referencing table (contains FK); `sourceTable` is referenced.

One-to-One requires the referencing column to be unique. GraphQL fields are created both ways using `nameInSource` and `nameInTarget`.

One-to-Many: `sourceTable` has a list field for related `targetTable` rows. `targetTable` has a single-field back to `sourceTable`.

### Mutation behaviors
- `insert` supports `on_conflict` using named constraints for resolution.
- `update` and `delete` operations require explicit `where` filters (non-nullable) to prevent mass modifications.

Example:
```graphql
mutation InsertPost($object: post_insert_input!) {
  insert_post(objects: [$object], on_conflict: {
    constraint: post_pkey,
    update_columns: [title, content]
  }) {
    id
  }
}
```

### Generated input and output types
The rules generate input types for insert/update operations, aggregate types, order_by, distinct_on enums, boolean expression filters (`_bool_exp`), and complex operand functions to support rich filtering and expressions.

Key principles for filtering:
1. Operator-first pattern: Every comparison predicate uses a comparison operator as the top-level key (e.g., `_eq: { ... }`).
2. Type determined by final value: Choose operand wrapper based on final comparison value type.
3. Everything is an operand: Literal, column reference, or function results must be wrapped in the corresponding `*_op` input type.

The document contains extensive sections describing the operand types for `text`, `bigint`, `decimal`, `boolean`, `jsonb`, `geo_point`, `timestamptz`, `timetz`, `date`, and associated array operands and functions (concatenation, substring, extract, adjust, etc.). It also documents `_in`/`_nin`, `_like`/`_ilike`, JSON path extraction, aggregation orderings, and more.

(Refer to the original `momen-database-gql-api-rules.mdc` file in this project for the full, exhaustive rules and examples.)

---

## 6) momen-stripe-payment-rules.mdc

---
description: How to make credit card payment via Stripe when using Momen.app's backend
alwaysApply: false
---

# Overview
Momen.app supports native Stripe integration for payments in projects. There are two modes: one-time and recurring (subscription). A conceptual order table must exist; typically orders should be created via actionflows. Stripe sends webhook events to configured project endpoints and those events are handled via actionflows to update order status and other state.

For frontend integration:
- Use Stripe’s JS/TS client. For React: `@stripe/react-stripe-js` and `@stripe/stripe-js`. For ES modules: `https://js.stripe.com/clover/stripe.js`.
- Initialize with the publishable key found in the project schema (publishable key is safe to embed in frontend code).

## One-time payment
Prerequisites: `order id`, `amount` (in minor units), `currency`. Use the GraphQL API:

```gql
mutation StripePay(
  $orderId: Long!
  $currency: String!
  $amount: BigDecimal!
) {
  stripePayV2(
    payDetails: {
      order_id: $orderId
      currency: $currency
      amount: $amount
    }
  ) {
    paymentClientSecret
    stripeReadableAmount
  }
}
```

Example variables:
```json
{
  "orderId": 167,
  "amount": 1990,
  "currency": "USD"
}
```

Example response:
```json
{
  "data": {
    "stripePayV2": {
      "paymentClientSecret": "pi_..._secret_...",
      "stripeReadableAmount": "$19.90"
    }
  }
}
```

## Recurring payment (subscription)
Prerequisite: order id and price id (Stripe price identifier). Mutation:

```gql
mutation CreateStripeRecurringPayment($orderId: Long!, $priceId: String!) {
  createStripeRecurringPayment(orderId: $orderId, priceId: $priceId) {
    amount
    clientSecret
    recurringPaymentId
    stripeReadableAmountAndCurrency
    stripeRecurring
  }
}
```

Example variables:
```json
{
  "orderId": 169,
  "priceId": "price_1SMhwECO2XREqHNZO9elpYVU"
}
```

Response includes `clientSecret`, `recurringPaymentId`, and readably formatted amount.

## Webhook handling
Stripe webhooks are handled by actionflows on the backend. Frontend should poll or use GraphQL subscriptions to get async webhook effects.

## Key handling
Write the Stripe publishable key directly into frontend source as it is intended to be public. Do NOT obfuscate it behind environment variables when used in the frontend.

---

## 7) momen-tpa-gql-api-rules.mdc

---
description: How to invoke third-party APIs via a Momen.app project's backend
alwaysApply: false
---

# Third Party APIs

## Overview
A Momen project can import multiple third-party HTTP APIs. These are treated as either `query` or `mutation` operations (conceptually mapping to GET vs POST semantics). Each TPA is defined by:

```typescript
type ScalarType = 'string' | 'boolean' | 'number' | 'integer';
type TypeDefinition =
  | ScalarType
  | { [key: string]: TypeDefinition | TypeDefinition[] };

interface ThirdPartyApiConfig {
  id: string;
  name: string;
  operation: 'query' | 'mutation';
  inputs: { [key: string]: TypeDefinition };
  outputs: { [key: string]: TypeDefinition };
}
```

The `operation` field determines the GraphQL root field name (e.g., `operation_<id>`).

## Invocation process
All declared inputs should be provided unless intentionally omitted. Binary or structured inputs are flattened into GraphQL variables. Example:

Given a TPA config (sample JSON in original file), the corresponding GraphQL mutation might look like:

```gql
mutation request_${nonce}($summary: String, $location: String, $description: String, $start_dateTime: String, $start_timeZone: String, $end_dateTime: String, $end_timeZone: String, $attendees:[String], $Authorization: String) {
  operation_lzb3ownk(fz_body: {}, arg1: $_1, arg2: $_2) {
    responseCode
    field_200_json {
      {subFieldSelections}
    }
 }
}
```

`field_200_json` is a canonical field representing successful 2xx responses. Always check `responseCode` to detect HTTP errors (4xx, 5xx) where `field_200_json` may be empty.

---

End of combined rules.