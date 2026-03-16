#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${GCP_SERVICE_NAME:-chronocanvas}"
REPOSITORY="${GCP_ARTIFACT_REPO:-chronocanvas}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:$(date +%Y%m%d-%H%M%S)"

# Build and push container image via Cloud Build.
gcloud builds submit \
  --project "${PROJECT_ID}" \
  --tag "${IMAGE}" \
  .

# Deploy to Cloud Run with required runtime environment variables.
gcloud run deploy "${SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --image "${IMAGE}" \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY:?Set GEMINI_API_KEY},GCP_PROJECT_ID=${GCP_PROJECT_ID:?Set GCP_PROJECT_ID},GCP_CLIENT_EMAIL=${GCP_CLIENT_EMAIL:?Set GCP_CLIENT_EMAIL},GCP_PRIVATE_KEY=${GCP_PRIVATE_KEY:?Set GCP_PRIVATE_KEY},GCP_STORAGE_BUCKET=${GCP_STORAGE_BUCKET:?Set GCP_STORAGE_BUCKET}"

echo "Deployed ${SERVICE} to Cloud Run in ${REGION}."
