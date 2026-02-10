#!/bin/bash
export PYTHONPATH=$PYTHONPATH:$(pwd)
venv/bin/pytest app/tests
