odoo.define('fdfs.widgets', function (require) {
    "use strict";
    var core = require('web.core');
    var ajax = require('web.ajax');
    var session = require('web.session');

    var common = require('web.form_common');
    var framework = require('web.framework');
    var ListView = require('web.ListView');
    var utils = require('web.utils');
    var list_widget_registry = core.list_widget_registry;

    var _t = core._t;
    var QWeb = core.qweb;
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
            //this.set_filename(name);
            //this.set_value(file_base64);
            //TODO upload to controller and get address of fdfs
            var data = {datas: file_base64, size: size, filename: name, type:content_type};

            session.rpc('/fdfs/upload',data)
                .then(function(result){
                    console.log(result);
                    if(result.code==0){
                        self.set_value(result.url);
                    }else{
                        self.do_warn(_t("File Upload"), result.message); 
                    }
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

    var FdfsFieldBinaryImageWidget = FdfsFieldBinaryFileWidget.extend({
        template: 'FieldBinaryImage',
        placeholder: "/web/static/src/img/placeholder.png",
        render_value: function() {
            var url = this.placeholder;
            var value = this.get('value');
            if(value) {
               url = value; 
            }
            // 在重新上传的过程中值会以base64字符的方式传过来，不作判断会导致错误对话框导出
            // if(url!=false && !url.startsWith('http')){
            //     return;
            // }
    
            var $img = $(QWeb.render("FieldBinaryImage-img", {widget: this, url: url}));
    
            var self = this;
            $img.click(function(e) {
                if(self.view.get("actual_mode") == "view") {
                    var $button = $(".o_form_button_edit");
                    $button.openerpBounce();
                    e.stopPropagation();
                }
            });
            this.$('> img').remove();
            if (self.options.size) {
                //$img.css("width", "" + self.options.size[0] + "px");
                //本身有img-response标签，所以可以不需要width
                $img.css("height", "" + self.options.size[1] + "px");
            }
            this.$el.prepend($img);
            // $img.on('error', function() {
            //     self.on_clear();
            //     $img.attr('src', self.placeholder);
            //     self.do_warn(_t("Image"), _t("Could not display the selected image."));
            // });
        },
        set_value: function(value_) {
            var changed = value_ !== this.get_value();
            this._super.apply(this, arguments);
            // By default, on binary images read, the server returns the binary size
            // This is possible that two images have the exact same size
            // Therefore we trigger the change in case the image value hasn't changed
            // So the image is re-rendered correctly
            if (!changed){
                this.trigger("change:value", this, {
                    oldValue: value_,
                    newValue: value_
                });
            }
        },
        is_false: function() {
            return false;
        },
        set_dimensions: function(height, width) {
            this.$el.css({
                maxWidth: width,
                minHeight: height,
            });
        },
    });

    // list 列表中图片显示
    var SkfListImage = list_widget_registry.get('field.url').extend({
        format: function(row_data, options){
            if(!row_data[this.id] || !row_data[this.id].value){
                return '';
            }
            var value = row_data[this.id].value;
            return QWeb.render('ListView.row.skf_list_image', {widget: this, src: value, options: options});
        }
    });

    ListView.List.include({
        render: function() {
            var result = this._super(this, arguments),
                self = this;
            this.$current.delegate('img.skf-list-img',
                'click', function() {
                    alert('click image');
                    return false;
                });
            return result;
        },
    });

    core.form_widget_registry.add('skf_field_binary', FdfsFieldBinaryWidget);
    core.form_widget_registry.add('skf_field_binary_file', FdfsFieldBinaryFileWidget);
    core.form_widget_registry.add('skf_field_binary_image', FdfsFieldBinaryImageWidget);
    list_widget_registry.add('field.skf_list_image', SkfListImage);

    return {
        FdfsFieldBinary: FdfsFieldBinaryWidget,
        FdfsFieldBinaryFile: FdfsFieldBinaryFileWidget,
        FdfsFieldBinaryImage: FdfsFieldBinaryImageWidget,
        SkfListImage: SkfListImage
    }
});