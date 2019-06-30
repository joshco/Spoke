
import { r } from '../../models';
import { getHash } from './guid'

function sendUnauthorizedResponse(res) {
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm=Contacts API' })
  res.end('Unauthorized')
}

function publicApi(features) {
  if (features.publicApi === true || process.env.PUBLIC_API === 'true') {
    return true
  } else {
    return false
  }
}

export async function authShortCircuit(req, res, orgId) {

  const organization = await r.knex('organization').where('id', orgId).first('features')
  const features = organization.features ? JSON.parse(organization.features) : {}
  const apiKey = features.apiKey;

  if (publicApi(features) === true) {
    return false
  }

  if (!(('authorization' in req.headers)
      || ('osdi-api-token' in req.headers))) {
    sendUnauthorizedResponse(res)
    return true
  }

  let apiKeyInHeader = undefined;
  const matchResult = req.headers.authorization ? req.headers.authorization.match(/Basic\s+(.*)$/) : undefined;

  if (matchResult && matchResult.length > 1) {
    apiKeyInHeader = matchResult[1]
  }


  const osdi_api_token = req.headers['osdi-api-token'];
  if (osdi_api_token) {
    apiKeyInHeader = osdi_api_token;
  }
  const bypass=(features.bypass==apiKeyInHeader);
  if (bypass) {
    return false;
  }

  const hashedApiKeyInHeader = getHash(apiKeyInHeader)
  if (!apiKey || !apiKeyInHeader || apiKey !== hashedApiKeyInHeader) {
    sendUnauthorizedResponse(res)
    return true
  }

  return false
}

export default {
  authShortCircuit
}