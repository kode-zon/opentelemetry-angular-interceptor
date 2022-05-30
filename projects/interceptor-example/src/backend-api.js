'use strict';

const express = require('express');
const createProxyMiddleware = require('http-proxy-middleware')


const PORT = process.env.PORT || 3000;
const backendApp = express();
backendApp.use(express.json());
backendApp.use(express.urlencoded({ extended: false }));
backendApp.use(createProxyMiddleware(
                  '/otel-collector', 
                  {
                    target: 'http://127.0.0.1:14268',
                    changeOrigin: true,
                    pathRewrite: {'^/otel-collector' : ''},
                    onProxyReq: (proxyReq, req, res) => {
                      var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
                      console.log("request to ::: " + fullUrl)
                    }
                  })
              )


class Result {
  constructor(result) {
    this.result = result;
  }
}


//
backendApp.get('/api', (req, res) => {
  return res.status(200).send(new Result("ok"));
})

backendApp.post('/api', (req, res) => {
  return res.status(201).send(new Result(req.body.result));
})

backendApp.get('/api/jsonp', (req, res) => {
  return res.jsonp(new Result("ok"));
})


backendApp.listen(PORT, () =>
  console.log(`Backend App for example-app listening on port ${PORT}!`),
);
