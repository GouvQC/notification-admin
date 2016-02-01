import csv
import re
import uuid

from datetime import date

from flask import (
    request,
    render_template,
    redirect,
    url_for,
    flash,
    abort,
    session
)

from flask_login import login_required
from werkzeug import secure_filename
from client.errors import HTTPError

from app.main import main
from app.main.forms import CsvUploadForm
from app.main.uploader import (
    s3upload,
    s3download
)
from app.main.dao import templates_dao
from app import job_api_client


@main.route("/services/<int:service_id>/sms/send", methods=['GET', 'POST'])
@login_required
def send_sms(service_id):
    form = CsvUploadForm()
    if form.validate_on_submit():
        try:
            csv_file = form.file.data
            filedata = _get_filedata(csv_file)
            upload_id = str(uuid.uuid4())
            template_id = request.form.get('template')
            s3upload(upload_id, service_id, filedata)
            session['upload_data'] = {"template_id": template_id, "original_file_name": filedata['file_name']}
            return redirect(url_for('.check_sms',
                                    service_id=service_id,
                                    upload_id=upload_id))
        except ValueError as e:
            message = 'There was a problem uploading: {}'.format(
                      csv_file.filename)
            flash(message)
            flash(str(e))
            return redirect(url_for('.send_sms', service_id=service_id))

    try:
        templates = templates_dao.get_service_templates(service_id)['data']
    except HTTPError as e:
        if e.status_code == 404:
            abort(404)
        else:
            raise e

    return render_template('views/send-sms.html',
                           templates=templates,
                           form=form,
                           service_id=service_id)


@main.route("/services/<int:service_id>/sms/check/<upload_id>",
            methods=['GET', 'POST'])
@login_required
def check_sms(service_id, upload_id):

    if request.method == 'GET':
        contents = s3download(service_id, upload_id)
        upload_result = _get_numbers(contents)
        upload_data = session['upload_data']
        original_file_name = upload_data.get('original_file_name')
        template_id = upload_data.get('template_id')
        template = templates_dao.get_service_template(service_id, template_id)['data']
        return render_template(
            'views/check-sms.html',
            upload_result=upload_result,
            message_template=template['content'],
            service_id=service_id
        )
    elif request.method == 'POST':
        upload_data = session['upload_data']
        original_file_name = upload_data.get('original_file_name')
        template_id = upload_data.get('template_id')
        session.pop('upload_data')
        try:
            job_api_client.create_job(upload_id, service_id, template_id, original_file_name)
        except HTTPError as e:
            if e.status_code == 404:
                abort(404)
            else:
                raise e

        return redirect(url_for('main.view_job',
                        service_id=service_id,
                        job_id=upload_id))


def _get_filedata(file):
    lines = file.read().decode('utf-8').splitlines()
    if len(lines) < 2:  # must be at least header and one line
        message = 'The file {} contained no data'.format(file.filename)
        raise ValueError(message)
    return {'file_name': file.filename, 'data': lines}


def _format_filename(filename):
    d = date.today()
    basename, extenstion = filename.split('.')
    formatted_name = '{}_{}.csv'.format(basename, d.strftime('%Y%m%d'))
    return secure_filename(formatted_name)


def _get_numbers(contents):
    pattern = re.compile(r'^\+44\s?\d{4}\s?\d{6}$')  # TODO need better validation
    reader = csv.DictReader(
        contents.split('\n'),
        lineterminator='\n',
        quoting=csv.QUOTE_NONE)
    valid, rejects = [], []
    for i, row in enumerate(reader):
        if pattern.match(row['phone']):
            valid.append(row)
        else:
            rejects.append({"line_number": i+2, "phone": row['phone']})
    return {"valid": valid, "rejects": rejects}
