import { CodegenConfig } from '@graphql-codegen/cli'
import { env } from './src/lib/env'

const config: CodegenConfig = {
  overwrite: true,
  schema: env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:8000/graphql',
  documents: ['src/**/*.{ts,tsx}', '!src/graphql/__generated__/**/*', '!src/hooks/graphql/**/*'],
  generates: {
    'src/graphql/__generated__/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
        fragmentMasking: false,
      },
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
        withMutationFn: true,
        withResultType: true,
        withMutationOptionsType: true,
        withRefetchFn: true,
        pureMagicComment: true,
        omitOperationSuffix: true,
        skipTypename: false,
        enumsAsTypes: false,
        dedupeOperationSuffix: true,
        namingConvention: 'keep',
        scalars: {
          DateTime: 'string',
          Date: 'string',
          BigInt: 'string',
          Decimal: 'string',
          JSON: 'Record<string, any>',
        },
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
      },
    },
    './src/graphql/__generated__/graphql.schema.json': {
      plugins: ['introspection'],
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
}

export default config