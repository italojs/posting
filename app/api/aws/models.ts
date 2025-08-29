export interface UploadFileInput {
    key: string;
    /**
     * Should be base64 for image
     */
    buffer: string;
    contentType: string;
}

export interface DeleteFileInput {
    key: string;
}

export interface DeleteMultipleFilesInput {
    keys: string[];
}

export interface GetAwsFileInput {
    key: string;
}
