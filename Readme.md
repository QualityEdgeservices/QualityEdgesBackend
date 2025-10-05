## Install Node Dependencies (one time execution)
> npm install

## To run the project in LOCAL ENV
> npm run dev

## Start the project in PROD ENV
> npm run start

## To build docker image of Medantrik MedTech Service Prod
> docker build -t qualityedgeservice/quality-edge-backend-service:1.0.0 .

## To run the build image
> docker run -d --name qualityedge-api-service -p 9000:9000 qualityedgeservice/quality-edge-backend-service:1.0.0


## docker login into server
> docker login -u qualityedgeservice -p dckr_pat_eSBd95WPvyopmAfX5RZ4hW7ih1s

## To push the docker image into private docker repo
> docker push qualityedgeservice/quality-edge-backend-service:1.0.0

## To pull the docker image from private docker repo
> docker pull qualityedgeservice/quality-edge-backend-service:1.0.0


> ls
> docker ps
> docker stop 7359bbfa2a91
> docker rm 7359bbfa2a91
> docker images
> docker rmi 994a6a740369


