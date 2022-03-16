#!/bin/sh

set -e
BASEPATH=s3://jkasu-embedded-deploy/webui
VERSION=`git describe --tags --always --dirty`
FILENAME=webui_$VERSION.tar.gz
OUTPUTPATH=$BASEPATH/$FILENAME

count=`aws s3 ls $OUTPUTPATH | wc -l`
if [ $count -gt 0 -a "$1" != "-f" ]; then
  echo "$OUTPUTPATH already exists. Use -f to overwrite"
  exit 1
fi

aws s3 cp $FILENAME $OUTPUTPATH
