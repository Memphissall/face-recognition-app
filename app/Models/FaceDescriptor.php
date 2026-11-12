<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaceDescriptor extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'descriptor' => 'array',
        'is_active'  => 'boolean',
    ];

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }
}