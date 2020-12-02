import os
import sys
import traceback
import gunicorn
import newrelic.agent  # See https://bit.ly/2xBVKBH
newrelic.agent.initialize() if os.getenv("NEW_RELIC", False) else {}  # noqa: E402 # noqa: E402

workers = 5
worker_class = "eventlet"
bind = "0.0.0.0:{}".format(os.getenv("PORT"))
accesslog = '-'
gunicorn.SERVER_SOFTWARE = 'Internal Web Server'


def on_starting(server):
    server.log.info("Starting Notifications Admin")


def worker_abort(worker):
    worker.log.info("worker received ABORT {}".format(worker.pid))
    for threadId, stack in sys._current_frames().items():
        worker.log.error(''.join(traceback.format_stack(stack)))


def on_exit(server):
    server.log.info("Stopping Notifications Admin")


def worker_int(worker):
    worker.log.info("worker: received SIGINT {}".format(worker.pid))
