package com.crm.repository;

import com.crm.domain.Deal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DealRepository extends JpaRepository<Deal, UUID> {
    List<Deal> findByStage(Deal.DealStage stage);
    List<Deal> findByContactId(UUID contactId);
}
