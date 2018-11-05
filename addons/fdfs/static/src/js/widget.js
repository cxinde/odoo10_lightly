odoo.define('fdfs.widgets', function (require) {
    "use strict";
    var core = require('web.core');
    var ajax = require('web.ajax');
    var session = require('web.session');

    var common = require('web.form_common');
    var framework = require('web.framework');
    var utils = require('web.utils');
    var _t = core._t;

    /**
     * 通用的Binary控件，一般不直接使用
     */
    var FdfsFieldBinaryWidget = common.AbstractField.extend(common.ReinitializeFieldMixin, {
        init: function(field_manager, node) {
            var self = this;
            this._super(field_manager, node);
            this.binary_value = false;
            this.useFileAPI = !!window.FileReader;
            this.max_upload_size = 25 * 1024 * 1024; // 25Mo
            if (!this.useFileAPI) {
                this.fileupload_id = _.uniqueId('o_fileupload');
                $(window).on(this.fileupload_id, function() {
                    var args = [].slice.call(arguments).slice(1);
                    self.on_file_uploaded.apply(self, args);
                });
            }
        },
        stop: function() {
            if (!this.useFileAPI) {
                $(window).off(this.fileupload_id);
            }
            this._super.apply(this, arguments);
        },
        initialize_content: function() {
            this.$inputFile = this.$('.o_form_input_file');
            this.$inputFile.change(this.on_file_change);
            var self = this;
            this.$('.o_select_file_button').click(function() {
                self.$inputFile.click();
            });
            this.$('.o_clear_file_button').click(this.on_clear);
        },
        on_file_change: function(e) {
            var self = this;
            var file_node = e.target;
            if ((this.useFileAPI && file_node.files.length) || (!this.useFileAPI && $(file_node).val() !== '')) {
                if (this.useFileAPI) {
                    var file = file_node.files[0];
                    if (file.size > this.max_upload_size) {
                        var msg = _t("The selected file exceed the maximum file size of %s.");
                        this.do_warn(_t("File upload"), _.str.sprintf(msg, utils.human_size(this.max_upload_size)));
                        return false;
                    }
                    var filereader = new FileReader();
                    filereader.readAsDataURL(file);
                    filereader.onloadend = function(upload) {
                        var data = upload.target.result;
                        data = data.split(',')[1];
                        self.on_file_uploaded(file.size, file.name, file.type, data);
                    };
                } else {
                    this.$('form.o_form_binary_form input[name=session_id]').val(this.session.session_id);
                    this.$('form.o_form_binary_form').submit();
                }
                this.$('.o_form_binary_progress').show();
                this.$('button').hide();
            }
        },
        on_file_uploaded: function(size, name) {
            if (size === false) {
                this.do_warn(_t("File Upload"), _t("There was a problem while uploading your file"));
                // TODO: use openerp web crashmanager
                console.warn("Error while uploading file : ", name);
            } else {
                this.on_file_uploaded_and_valid.apply(this, arguments);
            }
            this.$('.o_form_binary_progress').hide();
            this.$('button').show();
        },
        /**
         * 从本地将文件读取到浏览器, 然后调用ajax请求上传内容，并返回得到的fdfs的文件地址
         * @param {*} size  大小 
         * @param {*} name  文件名称
         * @param {*} content_type  文件类型 
         * @param {*} file_base64   文件Base64
         */
        on_file_uploaded_and_valid: function(size, name, content_type, file_base64) {
            var self = this;
            this.binary_value = true;
            this.set_filename(name);
            this.set_value(file_base64);
            //TODO upload to controller and get address of fdfs
            var data = {datas: file_base64, size: size, filename: name, type:content_type};

            session.rpc('/fdfs/upload',data)
                .then(function(result){
                    console.log(result);
                    //alert(result.url);
                    self.set_value(result.url);
                });
        },
        /**
         * 点击下载时调用的方法
         * @param {*} ev 点击下载按钮的事件 
         */
        on_save_as: function(ev) {
            var value = this.get('value');
            if (!value) {
                this.do_warn(_t("Save As..."), _t("The field is empty, there's nothing to save !"));
                ev.stopPropagation();
            } else {
                window.open(value);
                ev.stopPropagation();
            }
        },
        set_filename: function(value) {
            var filename = this.node.attrs.filename;
            if (filename) {
                var field = this.field_manager.fields[filename];
                if (field) {
                    field.set_value(value);
                    field._dirty_flag = true;
                }
            }
        },
        on_clear: function() {
            this.binary_value = false;
            this.set_filename('');
            this.set_value(false); // FIXME do not really remove the value
        }
    });

    // 普通文件控件
    var FdfsFieldBinaryFileWidget = FdfsFieldBinaryWidget.extend({
        template: 'FieldBinaryFile',
        initialize_content: function() {
            var self = this;
            this._super();
            if (this.get("effective_readonly")) {
                this.$el.click(function(ev) {
                    if (self.get('value') && self.view.datarecord.id) {
                        self.on_save_as(ev);
                    }
                    return false;
                });
            } else {
                this.$input = this.$('.o_form_input').eq(0);
                this.$input.on('click', function() {
                    self.$inputFile.click();
                });
            }
        },
        /**
         * Render the value of the binary file field
         *
         * The value depends on the mode (readonly/edit) and the attribute filename
         * in the xml node of the field:
         *
         *
         *              with filename       without filename
         *           [------------------|-----------------------]
         * readonly: |  saved filename  |      binary size      |
         *     edit: | current filename | base64 representation |
         *           [------------------|-----------------------]
         *
         *
         * This is how the filename is retrieved:
         *
         *   - Suppose that the binary field is named 'data'
         *   - The xml node of this field is as follow:
         *
         *        `<field name='data' filename='fdata'/>`
         *
         *   - 'fdata' is another field whose value is the filename
         *   - On the following record:
         *
         *          `{data: "Cg==1das02fa01", fdata: 'my-file.txt'}`
         *
         *   - The content of the file is the value of 'data': Cg==1das02fa01
         *   - The filename is the value of 'fdata': my-file.txt
         */
        render_value: function() {
            var filename;
            var val = this.get('value');
            if (this.get("effective_readonly")) {
                // Filename from saved state (might render from a discard operation)
                //filename = this.view.datarecord[this.node.attrs.filename]; // do not forward-port >= 11.0
                this.do_toggle(!!val);
                if (val) {
                    this.$el.empty().append($("<span/>").addClass('fa fa-download'));
                    // if (this.view.datarecord.id) {
                    //     this.$el.css('cursor', 'pointer');
                    // } else {
                    //     this.$el.css('cursor', 'not-allowed');
                    // }
                    // if (filename) {
                    //     this.$el.append(" " + filename);
                    // }
                }
            } else {
                // Filename at the moment (might be unsaved state)
                //var filenameField = this.field_manager.fields[this.node.attrs.filename]; // do not forward-port >= 11.0
                //filename = filenameField ? filenameField.get('value') : '';
                if(val) {
                    this.$el.children().removeClass('o_hidden');
                    this.$('.o_select_file_button').first().addClass('o_hidden');
                    this.$input.val(this.get('value'));
                } else {
                    this.$el.children().addClass('o_hidden');
                    this.$('.o_select_file_button').first().removeClass('o_hidden');
                }
            }
        }
    });

    
    //core.form_widget_registry.add('skf_fdfs_image', FdfsImageBinary);
    core.form_widget_registry.add('skf_field_binary', FdfsFieldBinaryWidget);
    core.form_widget_registry.add('skf_field_binary_file', FdfsFieldBinaryFileWidget);

    return {
        //FdfsImageBinary:FdfsImageBinaryWidget,
        FdfsFieldBinary:FdfsFieldBinaryWidget,
        FdfsFieldBinaryFile:FdfsFieldBinaryFileWidget
    }
});