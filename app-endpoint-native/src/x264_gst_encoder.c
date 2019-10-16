#include <gst/gst.h>
#include <gst/app/gstappsrc.h>
#include <gst/app/gstappsink.h>
#include <stdio.h>

#include "x264_gst_encoder.h"

struct x264_gst_alpha_encoder {
    // base type
    struct encoder base_encoder;

    // gstreamer
    GstAppSrc *app_src;
    GstElement *videobox;
    GstAppSink *app_sink_alpha;
    GstAppSink *app_sink;
    GstElement *pipeline;
};

struct x264_gst_encoder {
    // base type
    struct encoder base_encoder;

    // gstreamer
    GstAppSrc *app_src;
    GstElement *videobox;
    GstAppSink *app_sink;
    GstElement *pipeline;
};

static GstFlowReturn
new_opaque_sample(GstAppSink *appsink, gpointer user_data) {
    const struct encoder *encoder = user_data;
    const GstSample *sample = gst_app_sink_pull_sample(appsink);

    encoder->callback_data.opaque_sample_ready_callback(encoder, sample);

    return GST_FLOW_OK;
}

static GstFlowReturn
new_alpha_sample(GstAppSink *appsink, gpointer user_data) {
    const struct encoder *encoder = user_data;
    const GstSample *sample = gst_app_sink_pull_sample(appsink);

    encoder->callback_data.alpha_sample_ready_callback(encoder, sample);

    return GST_FLOW_OK;
}

static int
x264_gst_alpha_encoder_ensure_size(struct x264_gst_alpha_encoder *x264_gst_alpha_encoder,
                                   const char *format,
                                   const u_int32_t width,
                                   const u_int32_t height) {
    const GstCaps *current_src_caps = gst_app_src_get_caps(x264_gst_alpha_encoder->app_src);
    const GstCaps *new_src_caps = gst_caps_new_simple("video/x-raw",
                                                      "framerate", GST_TYPE_FRACTION, 60, 1,
                                                      "format", G_TYPE_STRING, format,
                                                      "width", G_TYPE_INT, width,
                                                      "height", G_TYPE_INT, height,
                                                      NULL);
    if (gst_caps_is_equal(current_src_caps, new_src_caps)) {
        gst_caps_unref((GstCaps *) new_src_caps);
        gst_caps_unref((GstCaps *) current_src_caps);
        return 0;
    }
    gst_caps_unref((GstCaps *) current_src_caps);

    gst_app_src_set_caps(x264_gst_alpha_encoder->app_src, new_src_caps);
    gst_caps_unref((GstCaps *) new_src_caps);

    g_object_set(x264_gst_alpha_encoder->videobox,
                 "bottom", -(height % 2),
                 "right", -(width % 2),
                 NULL);

    return 0;
}

static int
x264_gst_encoder_ensure_size(struct x264_gst_encoder *x264_gst_encoder,
                             const char *format,
                             const u_int32_t width,
                             const u_int32_t height) {
    const GstCaps *current_src_caps = gst_app_src_get_caps(x264_gst_encoder->app_src);
    const GstCaps *new_src_caps = gst_caps_new_simple("video/x-raw",
                                                      "framerate", GST_TYPE_FRACTION, 60, 1,
                                                      "format", G_TYPE_STRING, format,
                                                      "width", G_TYPE_INT, width,
                                                      "height", G_TYPE_INT, height,
                                                      NULL);
    if (gst_caps_is_equal(current_src_caps, new_src_caps)) {
        gst_caps_unref((GstCaps *) new_src_caps);
        gst_caps_unref((GstCaps *) current_src_caps);
        return 0;
    }
    gst_caps_unref((GstCaps *) current_src_caps);

    gst_app_src_set_caps(x264_gst_encoder->app_src, new_src_caps);
    gst_caps_unref((GstCaps *) new_src_caps);

    g_object_set(x264_gst_encoder->videobox,
                 "bottom", -(height % 2),
                 "right", -(width % 2),
                 NULL);

    return 0;
}

static int
x264_gst_alpha_encoder_destroy(const struct encoder *encoder) {
    struct x264_gst_alpha_encoder *x264_gst_alpha_encoder;

    x264_gst_alpha_encoder = (struct x264_gst_alpha_encoder *) encoder;
    // TODO cleanup all gstreamer resources

    x264_gst_alpha_encoder->base_encoder.destroy = NULL;
    x264_gst_alpha_encoder->base_encoder.encode = NULL;

    gst_object_unref(x264_gst_alpha_encoder->app_src);
    gst_object_unref(x264_gst_alpha_encoder->videobox);
    gst_object_unref(x264_gst_alpha_encoder->app_sink);

    // gstreamer pipeline
    gst_element_set_state(x264_gst_alpha_encoder->pipeline, GST_STATE_NULL);
    gst_object_unref(x264_gst_alpha_encoder->pipeline);

    free(x264_gst_alpha_encoder);
    return 0;
}

static int
x264_gst_encoder_destroy(const struct encoder *encoder) {
    struct x264_gst_encoder *x264_gst_encoder;

    x264_gst_encoder = (struct x264_gst_encoder *) encoder;
    // TODO cleanup all gstreamer resources

    x264_gst_encoder->base_encoder.destroy = NULL;
    x264_gst_encoder->base_encoder.encode = NULL;

    gst_object_unref(x264_gst_encoder->app_src);
    gst_object_unref(x264_gst_encoder->videobox);
    gst_object_unref(x264_gst_encoder->app_sink);

    // gstreamer pipeline
    gst_element_set_state(x264_gst_encoder->pipeline, GST_STATE_NULL);
    gst_object_unref(x264_gst_encoder->pipeline);

    free(x264_gst_encoder);
    return 0;
}

static int
x264_gst_alpha_encoder_encode(const struct encoder *encoder,
                              void *buffer_data,
                              const size_t buffer_size,
                              const char *format,
                              const uint32_t buffer_width,
                              const uint32_t buffer_height) {
    struct x264_gst_alpha_encoder *x264_gst_alpha_encoder = (struct x264_gst_alpha_encoder *) encoder;
    GstBuffer *buffer = gst_buffer_new_wrapped(buffer_data, buffer_size);
    // FIXME find a way so that the buffer doesn't free the memory instead of keeping the gst_buffer object alive eternally (mem leak)
    gst_buffer_ref(buffer);

    x264_gst_alpha_encoder_ensure_size(x264_gst_alpha_encoder, format, buffer_width, buffer_height);
    gst_app_src_push_buffer(x264_gst_alpha_encoder->app_src, buffer);

    return 0;
}

static int
x264_gst_encoder_encode(const struct encoder *encoder,
                        void *buffer_data,
                        const size_t buffer_size,
                        const char *format,
                        const uint32_t buffer_width,
                        const uint32_t buffer_height) {
    struct x264_gst_encoder *x264_gst_encoder = (struct x264_gst_encoder *) encoder;
    GstBuffer *buffer = gst_buffer_new_wrapped(buffer_data, buffer_size);
    // FIXME find a way so that the buffer doesn't free the memory instead of keeping the gst_buffer object alive eternally (mem leak)
    gst_buffer_ref(buffer);

    x264_gst_encoder_ensure_size(x264_gst_encoder, format, buffer_width, buffer_height);
    gst_app_src_push_buffer(x264_gst_encoder->app_src, buffer);

    return 0;
}

struct encoder *
x264_gst_alpha_encoder_create(const char *format, uint32_t width, uint32_t height) {
    struct x264_gst_alpha_encoder *x264_gst_alpha_encoder;

    x264_gst_alpha_encoder = calloc(1, sizeof(struct x264_gst_alpha_encoder));
    x264_gst_alpha_encoder->base_encoder.destroy = x264_gst_alpha_encoder_destroy;
    x264_gst_alpha_encoder->base_encoder.encode = x264_gst_alpha_encoder_encode;

    gst_init(NULL, NULL);
    x264_gst_alpha_encoder->pipeline = gst_parse_launch(
            "appsrc name=src format=3 caps=video/x-raw ! "
            "videobox name=videobox border-alpha=0 ! "
            "tee name=t ! queue ! "
            "glupload ! "
            "glcolorconvert ! "
            "glshader fragment=\"\n"
            "#version 120\n"
            "#ifdef GL_ES\n"
            "    precision mediump float;\n"
            "#endif\n"
            "varying vec2 v_texcoord;\n"
            "uniform sampler2D tex;\n"
            "uniform float time;\n"
            "uniform float width;\n"
            "uniform float height;\n"
            "void main () {\n"
            "        vec4 pix = texture2D(tex, v_texcoord);\n"
            "        gl_FragColor = vec4(pix.a,pix.a,pix.a,0);\n"
            "}\n"
            "\""
            "vertex = \"\n"
            "#version 120\n"
            "#ifdef GL_ES\n"
            "    precision mediump float;\n"
            "#endif\n"
            "attribute vec4 a_position;\n"
            "attribute vec2 a_texcoord;\n"
            "varying vec2 v_texcoord;\n"
            "void main() {\n"
            "        gl_Position = a_position;\n"
            "        v_texcoord = a_texcoord;\n"
            "}\n"
            "\" ! "
            "glcolorconvert ! video/x-raw(memory:GLMemory),format=I420 ! "
            "gldownload ! "
            "x264enc key-int-max=1 byte-stream=true qp-max=32 tune=zerolatency speed-preset=veryfast ! "
            "video/x-h264,profile=constrained-baseline,stream-format=byte-stream,alignment=au,framerate=60/1 ! "
            "appsink name=alphasink "
            "t. ! queue ! "
            "glupload ! "
            "glcolorconvert ! video/x-raw(memory:GLMemory),format=I420 ! "
            "gldownload !"
            "x264enc key-int-max=1 byte-stream=true qp-max=32 tune=zerolatency speed-preset=veryfast ! "
            "video/x-h264,profile=constrained-baseline,stream-format=byte-stream,alignment=au,framerate=60/1 ! "
            "appsink name=sink",
            NULL);

    x264_gst_alpha_encoder->app_src = GST_APP_SRC(
            gst_bin_get_by_name(GST_BIN(x264_gst_alpha_encoder->pipeline), "src"));
    x264_gst_alpha_encoder->videobox = gst_bin_get_by_name(GST_BIN(x264_gst_alpha_encoder->pipeline), "videobox");
    x264_gst_alpha_encoder->app_sink_alpha = GST_APP_SINK(
            gst_bin_get_by_name(GST_BIN(x264_gst_alpha_encoder->pipeline), "alphasink"));
    x264_gst_alpha_encoder->app_sink = GST_APP_SINK(
            gst_bin_get_by_name(GST_BIN(x264_gst_alpha_encoder->pipeline), "sink"));

    x264_gst_alpha_encoder_ensure_size(x264_gst_alpha_encoder, format, width, height);

    GstAppSinkCallbacks opaque_sample_callbacks = {
            .eos = NULL,
            .new_sample = new_opaque_sample,
            .new_preroll = NULL
    }, alpha_sample_callbacks = {
            .eos = NULL,
            .new_sample = new_alpha_sample,
            .new_preroll = NULL
    };

    gst_app_sink_set_callbacks(x264_gst_alpha_encoder->app_sink,
                               &opaque_sample_callbacks,
                               (gpointer) x264_gst_alpha_encoder,
                               NULL);
    gst_app_sink_set_callbacks(x264_gst_alpha_encoder->app_sink_alpha,
                               &alpha_sample_callbacks,
                               (gpointer) x264_gst_alpha_encoder,
                               NULL);

    gst_element_set_state(x264_gst_alpha_encoder->pipeline, GST_STATE_PLAYING);

    return (struct encoder *) x264_gst_alpha_encoder;
}

struct encoder *
x264_gst_encoder_create(char *format, uint32_t width, uint32_t height) {
    struct x264_gst_encoder *x264_gst_encoder;

    x264_gst_encoder = calloc(1, sizeof(struct x264_gst_encoder));
    x264_gst_encoder->base_encoder.destroy = x264_gst_encoder_destroy;
    x264_gst_encoder->base_encoder.encode = x264_gst_encoder_encode;

    gst_init(NULL, NULL);
    x264_gst_encoder->pipeline = gst_parse_launch(
            "appsrc name=src format=3 caps=video/x-raw ! "
            "videobox name=videobox border-alpha=0 ! "
            "glupload ! "
            "glcolorconvert ! video/x-raw(memory:GLMemory),format=I420 ! "
            "gldownload !"
            "x264enc byte-stream=true qp-max=32 tune=zerolatency speed-preset=veryfast ! "
            "video/x-h264,profile=constrained-baseline,stream-format=byte-stream,alignment=au,framerate=60/1 ! "
            "appsink name=sink",
            NULL);

    x264_gst_encoder->app_src = GST_APP_SRC(gst_bin_get_by_name(GST_BIN(x264_gst_encoder->pipeline), "src"));
    x264_gst_encoder->videobox = gst_bin_get_by_name(GST_BIN(x264_gst_encoder->pipeline), "videobox");
    x264_gst_encoder->app_sink = GST_APP_SINK(
            gst_bin_get_by_name(GST_BIN(x264_gst_encoder->pipeline), "sink"));

    x264_gst_encoder_ensure_size(x264_gst_encoder, format, width, height);

    GstAppSinkCallbacks opaque_sample_callbacks = {
            .eos = NULL,
            .new_sample = new_opaque_sample,
            .new_preroll = NULL
    };

    gst_app_sink_set_callbacks(x264_gst_encoder->app_sink,
                               &opaque_sample_callbacks,
                               (gpointer) x264_gst_encoder,
                               NULL);

    gst_element_set_state(x264_gst_encoder->pipeline, GST_STATE_PLAYING);

    return (struct encoder *) x264_gst_encoder;
}
