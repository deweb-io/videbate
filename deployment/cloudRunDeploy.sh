#!/usr/bin/env bash

# NOTE: The env to deploy is hard-coded to prevent the user from doing a mistake.
deploy_env=creator-eco-stage

# Get to the root dir.
cd "$(dirname "${BASH_SOURCE[0]}")"/..

# Get gcloud CLI if needed.
GCP_CLI="$(type -p gcloud)" || GCP_CLI=./deployment/google-cloud-sdk/bin/gcloud
if ! [ -x  "$GCP_CLI" ]; then
    gcloud_version="413.0.0-linux-x86_64"
    gcloud_mirror="https://dl.google.com/dl/cloudsdk/channels/rapid/downloads"
    echo "downloading gcloud CLI $gcloud_version"
    curl "$gcloud_mirror/google-cloud-cli-$gcloud_version.tar.gz" | tar xz
fi

read -p "Deploy to "${deploy_env}"? (yes/NO)" ans
if [[ "yes" == "$ans" ]]; then
    # Set working project.
    "$GCP_CLI" config set project "$deploy_env"
    # Upload docker image.
    "$GCP_CLI" builds submit --tag gcr.io/$deploy_env/videbate
    # Deploy to Cloud Run.
    "$GCP_CLI" beta run deploy --image gcr.io/$deploy_env/videbate --platform managed
fi
