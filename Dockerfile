FROM node
WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
RUN yarn
COPY . .

RUN yarn build

EXPOSE 80

CMD ["yarn","start_prod"]