
package com.mems.service.impl;

import com.mems.entity.RefreshToken;

public interface IRefreshTokenService {

    String createRefreshToken(String accountId);

    RefreshToken validateAndLock(String rawToken);

    String rotate(RefreshToken oldToken);

    void revoke(RefreshToken token);
}
