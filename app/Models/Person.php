<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Person extends Model
{
    protected $guarded = ['id'];

    public function descriptors(): HasMany
    {
        return $this->hasMany(FaceDescriptor::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(RecognitionLog::class);
    }
}