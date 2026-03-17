# n8n Intake Workflow

This folder contains a clean replacement workflow for the website quote form:

- [rock-solid-website-intake-to-r2-highlevel.json](./rock-solid-website-intake-to-r2-highlevel.json)

## What It Does

1. Accepts the website form as `multipart/form-data`
2. Uploads any attached images to Cloudflare R2 through the `S3` node
3. Builds public URLs on `https://images.rocksolidleveling.com`
4. Creates or updates the HighLevel contact
5. Stores all image URLs as one newline-separated text value in a HighLevel custom field

## Workflow Setup

After importing the workflow in n8n:

1. Assign your `S3` credential on the `Upload to R2` node
2. Create an `HTTP Header Auth` credential and assign it to `Upsert Contact @ HighLevel`
3. In that credential, use:
   - Header Name: `Authorization`
   - Header Value: `Bearer <YOUR_PRIVATE_INTEGRATION_TOKEN>`
4. Replace `REPLACE_WITH_R2_BUCKET_NAME` in the `Upload to R2` node
5. Replace `REPLACE_WITH_LOCATION_ID` in the `Upsert Contact @ HighLevel` node
6. Replace these HighLevel custom field IDs:
   - `REPLACE_WITH_SQUARE_FEET_FIELD_ID`
   - `REPLACE_WITH_IMAGE_URLS_FIELD_ID`
   - `REPLACE_WITH_NOTES_FIELD_ID`
7. Confirm the webhook path matches the frontend value in `VITE_N8N_WEBHOOK_URL`

The template uses current `Code` nodes for the custom JavaScript steps, not the legacy `Function` node.
The HighLevel step now uses a plain `HTTP Request` node instead of the built-in HighLevel node, which makes it easier to use a Private Integration token directly.

## HighLevel Request Notes

The `Upsert Contact @ HighLevel` node calls:

- `POST https://services.leadconnectorhq.com/contacts/upsert/`

It sends:

- `Accept: application/json`
- `Content-Type: application/json`
- `Version: 2021-07-28`
- `Authorization: Bearer <YOUR_PRIVATE_INTEGRATION_TOKEN>` through the credential

The JSON body includes:

- your `locationId`
- the mapped contact details from the form
- the quote-form tags
- `customFields` for square footage, image URLs, and notes

If you want to test auth outside n8n first, try the same token against the HighLevel API in Postman or curl. If that succeeds there, the `HTTP Request` node should work with the same header-based auth.
If you still get `401` or `403`, the next things to verify are that the token has the needed contact permissions and that the `locationId` belongs to the same HighLevel account context as the token.

## R2 Credential Notes

For Cloudflare R2 in the n8n `S3` credential, use:

- Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- Region: `auto`
- Access Key ID: your R2 access key
- Secret Access Key: your R2 secret

The workflow assumes the uploaded files are publicly available at:

`https://images.rocksolidleveling.com/<object-key>`

If your custom domain path works differently, update the `publicBaseUrl` constant in the `Normalize Submission` node.

## Self-Hosted Upload Limits

Yes, because your n8n is self-hosted, you can raise the form upload limits.

The main environment variables are:

- `N8N_PAYLOAD_SIZE_MAX`
- `N8N_FORMDATA_FILE_SIZE_MAX`

Example:

```env
N8N_PAYLOAD_SIZE_MAX=32
N8N_FORMDATA_FILE_SIZE_MAX=64
```

Those values are in MiB. If you run n8n behind Nginx, Cloudflare, Traefik, or another proxy, make sure the proxy limit is not lower than n8n's limit.

## Notes

- This new workflow intentionally removes the old JotForm URL parsing.
- It stores image links in HighLevel as text, which matches your preferred CRM behavior.
- It uses a HighLevel Private Integration token through `HTTP Header Auth` instead of the built-in HighLevel node credential.
- It does not create Stripe quotes or opportunities yet. That can be added after the contact node once the intake path is stable.
