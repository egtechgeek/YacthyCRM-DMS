<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];
    
    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['mfa_enabled', 'permissions'];

    /**
     * Check if user has a specific role
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * Check if user is admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is office staff
     */
    public function isStaff(): bool
    {
        return $this->role === 'office_staff';
    }
    
    /**
     * Check if user is office staff (alias for clarity)
     */
    public function isOfficeStaff(): bool
    {
        return $this->role === 'office_staff';
    }
    
    /**
     * Check if user is accountant
     */
    public function isAccountant(): bool
    {
        return $this->role === 'accountant';
    }
    
    /**
     * Check if user is employee
     */
    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    /**
     * Check if user is customer
     */
    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    /**
     * Relationship with MFA settings
     */
    public function mfaSetting()
    {
        return $this->hasOne(MfaSetting::class);
    }

    /**
     * Relationship with customer (if user is a customer)
     */
    public function customer()
    {
        return $this->hasOne(Customer::class);
    }
    
    /**
     * Get MFA enabled status
     */
    public function getMfaEnabledAttribute(): bool
    {
        return $this->mfaSetting && $this->mfaSetting->mfa_enabled;
    }

    /**
     * Get granted permissions for this user's role
     */
    public function getPermissionsAttribute(): array
    {
        return RolePermission::getRolePermissions($this->role);
    }
}

