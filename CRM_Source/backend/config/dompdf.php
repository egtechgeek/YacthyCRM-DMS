<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Settings
    |--------------------------------------------------------------------------
    |
    | Set some default values. It is possible to add all defines that can be set
    | in dompdf_config.inc.php. You can also override the entire config file.
    |
    */
    'show_warnings' => false,   // Throw an Exception on warnings from dompdf
    
    'public_path' => null,  // Override the public path if needed

    /*
     * Dejavu Sans font is missing glyphs for converted entities, turn it off if you need to show € and £.
     */
    'convert_entities' => true,

    'options' => [
        /*
         * The location of the DOMPDF font directory
         *
         * The location of the font directory where DOMPDF will automatically look for fonts.
         * Note: This is used by the font metrics cache.
         */
        'font_dir' => storage_path('fonts'), // advised by dompdf

        /*
         * The location of the DOMPDF font cache directory
         *
         * This directory contains the cached font metrics for the fonts used by DOMPDF.
         * This directory can be the same as DOMPDF_FONT_DIR
         */
        'font_cache' => storage_path('fonts'),

        /*
         * The location of a temporary directory.
         *
         * The directory specified must be writeable by the webserver process.
         * *Note: This is used by the font metrics cache.*
         */
        'temp_dir' => sys_get_temp_dir(),

        /*
         * ==== IMPORTANT ====
         *
         * dompdf's "chroot": Prevents dompdf from accessing system files or other
         * files on the webserver.  All local files opened by dompdf must be in a
         * subdirectory of this directory.  DO NOT set it to '/' since this could
         * allow an attacker to use dompdf to read: make sure it's a private
         * directory instead.
         *
         * This is automatically set to the public directory.
         */
        'chroot' => realpath(base_path('public')),

        'log_output_file' => storage_path('logs/dompdf.log'),

        /*
         * Whether to enable font subsetting or not.
         */
        'enable_font_subsetting' => false,

        /*
         * The PDF rendering backend to use
         *
         * Valid options are 'PDFLib', 'CPDF' (deprecated), 'GD', and
         * 'auto'. 'auto' will look for PDFLib and use it if found, or if
         * not it will fall back to CPDF.
         */
        'pdf_backend' => 'CPDF',

        /*
         * PDFlib license key
         *
         * If you are using a licensed, commercial version of PDFlib, specify
         * your license key here.  If you are using PDFlib-Lite or are evaluating
         * PDFlib, remove or comment out this line.
         *
         * See http://www.pdflib.com for more information.
         */
        'pdflib_license' => env('PDFLIB_LICENSE', ''),

        /*
         * html target media view which should be rendered into pdf.
         * List of types and parsing rules for future extensions:
         * http://www.w3.org/TR/REC-html40/types.html
         *   http://www.w3.org/TR/CSS2/media.html#media-types
         *
         * Print media type is used for PDF generation.
         */
        'default_media_type' => 'screen',

        /*
         * The default paper size.
         *
         * @see Dompdf\Adapter\CPDF::PAPER_SIZES for valid sizes ('letter', 'legal', 'A4', etc.)
         */
        'default_paper_size' => 'letter',

        /*
         * The default paper orientation.
         *
         * Valid options are 'portrait' or 'landscape'
         */
        'default_paper_orientation' => 'portrait',

        /*
         * The default font family
         *
         * Used if no suitable fonts can be found. This must exist in the font folder.
         * @see DomPDF_FONT_DIR
         */
        'default_font' => 'serif',

        /*
         * Image DPI setting
         *
         * This setting determines the default DPI setting for images (default 96 dpi).
         * @see http://pxdpi.com for a good explanation of DPI.
         */
        'dpi' => 96,

        /*
         * Enable embedded PHP
         *
         * If this setting is set to true then DOMPDF will automatically evaluate
         * embedded PHP contained within <script type="text/php"> ... </script> tags.
         *
         * Enabling this for documents you do not trust (e.g., arbitrary remote html
         * pages) is a security risk.  Set this option to false if you wish to process
         * untrusted documents.
         */
        'enable_php' => false,

        /*
         * Enable inline Javascript
         *
         * If this setting is set to true then DOMPDF will automatically insert
         * JavaScript code contained within <script type="text/javascript"> ... </script> tags.
         */
        'enable_javascript' => true,

        /*
         * Enable remote file access
         *
         * If this setting is set to true, DOMPDF will access remote sites for
         * images and CSS files as required.
         * This is required for part of test case www/test/image_variants.html through www/examples.php
         *
         * @see http://www.dompdf.com/usage.php for the configuration options
         */
        'enable_remote' => true,

        /*
         * A ratio applied to the fonts height to be more like browsers' line height
         */
        'font_height_ratio' => 1.1,

        /*
         * Use the HTML5 Lib parser
         *
         * @deprecated This feature is now always on in dompdf
         *
         * @see https://github.com/dompdf/dompdf/issues/1286
         */
        'enable_html5_parser' => true,
    ],
];

