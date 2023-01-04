#!/usr/bin/env bash

# NOTE: The env to deploy is hard-coded to prevent the user from making a mistake.
deploy_env="creator-eco-stage"

read -p "Deploy to "${deploy_env}"? (yes/NO)" ans
if [[ "yes" == "$ans" ]]; then
    # set working project
    gcloud config set project $deploy_env

    # upload docker image and deploy
    gcloud builds submit --tag gcr.io/$deploy_env/videbate
    gcloud beta run deploy --image gcr.io/$deploy_env/videbate --platform managed
fi
