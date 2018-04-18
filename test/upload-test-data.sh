#!/bin/bash

for addr in \
  14ZFBbsWmL8FW3XrG2JX45dxBA8UKavsPW \
  1CWu2kd7TkUmRc8d28yLy2aLb62EUF2kvj \
  1tiaC6mdPVRbtQAhFXgFZQ81HVpp3T7zo \
  1LnegwJiuyfmoF8kiqvx8dsaQgjm3fgHM2 \
  13pAaEsDBjYLhkkAFQpdNGMFoYHdLYEc6f
do
  (
    set -x
    gcloud beta functions call setNote --data '{"addr":"'${addr}'", "cost":1e3, "costUnit":"NZD", "status":"available", "value":1e5, "valueUnit":"BTC"}'
  )
done
