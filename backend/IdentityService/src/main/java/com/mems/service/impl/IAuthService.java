
package com.mems.service.impl;

import com.mems.dto.LoginRequest;
import com.mems.dto.LoginResponse;
import com.mems.dto.RefreshTokenRequest;
import com.mems.dto.LogoutRequest;

public interface IAuthService {

    LoginResponse login(LoginRequest request);

    LoginResponse refresh(RefreshTokenRequest request);

    void logout(LogoutRequest request);
}
