<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;

class CloudinaryService
{
    protected Cloudinary $cloudinary;

    public function __construct()
    {
        $this->cloudinary = new Cloudinary(env('CLOUDINARY_URL'));
    }

    public function upload(UploadedFile $file, string $folder = 'uploads'): string
    {
        $result = $this->cloudinary->uploadApi()->upload(
            $file->getRealPath(),
            ['folder' => $folder]
        );

        return $result['secure_url'];
    }
}